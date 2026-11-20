import json
from extensions import db
from models import (
    RateCard, RateZone, RateLine, Surcharge, FuelSurchargeIndex,
    ClientRateAgreement, ClientRateAgreementLine, RateQuote,
    ChargeableWeightRule, Client
)
from services.rates.rate_zone_service import RateZoneService
from services.rates.vat_service import VATService
from datetime import datetime

class RatingEngine:
    
    @staticmethod
    def calculate_quote(client_id, rate_card_id, pickup_location_id, delivery_location_id, service_type_id,
                        total_weight_kg, total_volume_m3, total_loading_metres):
        
        # Step 1: Identify origin and destination zones
        origin_zone = RateZoneService.find_zone_for_location(rate_card_id, pickup_location_id)
        destination_zone = RateZoneService.find_zone_for_location(rate_card_id, delivery_location_id)
        
        if not origin_zone or not destination_zone:
            raise ValueError("Could not resolve origin or destination zone for the given locations.")

        # Step 2: Calculate chargeable weight
        rule = ChargeableWeightRule.query.filter_by(rate_card_id=rate_card_id).first()
        volumetric_factor = rule.volumetric_factor if rule else 333.0
        
        volumetric_weight = total_volume_m3 * volumetric_factor
        
        chargeable_weight = total_weight_kg
        if rule:
            if rule.rule == 'volumetric_weight':
                chargeable_weight = volumetric_weight
            elif rule.rule == 'higher_of_both':
                chargeable_weight = max(total_weight_kg, volumetric_weight)
        else:
            chargeable_weight = max(total_weight_kg, volumetric_weight)

        # Step 3: Find the matching rate line
        rate_line = RateLine.query.filter_by(
            rate_card_id=rate_card_id,
            origin_zone_id=origin_zone.id,
            destination_zone_id=destination_zone.id,
            service_type_id=service_type_id
        ).filter(
            RateLine.weight_min_kg <= chargeable_weight,
            (RateLine.weight_max_kg >= chargeable_weight) | (RateLine.weight_max_kg.is_(None))
        ).first()

        if not rate_line:
            raise ValueError("No matching rate line found for the given parameters.")

        # Step 4: Calculate base freight amount
        if rate_line.rate_basis == 'per_kg':
            base_amount = chargeable_weight * float(rate_line.rate)
        elif rate_line.rate_basis == 'per_loading_metre':
            base_amount = total_loading_metres * float(rate_line.rate)
        elif rate_line.rate_basis == 'flat':
            base_amount = float(rate_line.rate)
        else:
            base_amount = float(rate_line.rate) # Fallback

        base_amount = max(base_amount, float(rate_line.minimum_charge))
        if rate_line.maximum_charge:
            base_amount = min(base_amount, float(rate_line.maximum_charge))

        # Step 5: Apply surcharges
        active_surcharges = Surcharge.query.filter_by(rate_card_id=rate_card_id, is_active=True).all()
        surcharges_applied = []
        total_surcharges = 0.0

        for surcharge in active_surcharges:
            # We assume a simplistic trigger matching for the MVP.
            # E.g. 'always', or check booking attributes
            triggered = False
            if surcharge.trigger_condition == 'always':
                triggered = True
                
            if triggered:
                amount = 0.0
                if surcharge.surcharge_type == 'percentage':
                    amount = base_amount * (float(surcharge.value) / 100)
                elif surcharge.surcharge_type == 'flat_per_shipment':
                    amount = float(surcharge.value)
                
                surcharges_applied.append({
                    'name': surcharge.name,
                    'type': surcharge.surcharge_type,
                    'amount': amount
                })
                total_surcharges += amount

        # Step 6: Apply client agreement discount
        # Only look for active agreements
        agreement = ClientRateAgreement.query.filter_by(
            client_id=client_id,
            rate_card_id=rate_card_id
        ).filter(
            ClientRateAgreement.valid_from <= datetime.utcnow().date(),
            ClientRateAgreement.valid_to >= datetime.utcnow().date()
        ).first()

        subtotal = base_amount + total_surcharges
        discount_amount = 0.0
        discount_applied = 0.0

        if agreement:
            if agreement.agreement_type == 'discount_on_standard' and agreement.discount_percentage:
                discount_applied = agreement.discount_percentage
                discount_amount = subtotal * (discount_applied / 100)
                subtotal -= discount_amount
            elif agreement.agreement_type == 'fixed_rate_override':
                agreement_line = ClientRateAgreementLine.query.filter_by(
                    agreement_id=agreement.id,
                    origin_zone_id=origin_zone.id,
                    destination_zone_id=destination_zone.id,
                    service_type_id=service_type_id
                ).first()
                if agreement_line:
                    # Ignore standard subtotal
                    if agreement_line.rate_basis == 'per_kg':
                        subtotal = chargeable_weight * float(agreement_line.fixed_rate)
                    elif agreement_line.rate_basis == 'flat':
                        subtotal = float(agreement_line.fixed_rate)
                    subtotal = max(subtotal, float(agreement_line.minimum_charge))
                    base_amount = subtotal
                    total_surcharges = 0.0
                    surcharges_applied = []

        # Step 7: Calculate VAT
        client = Client.query.get(client_id)
        client_country = client.country if client else 'IT' # Default to Italy
        
        vat_rate = VATService.get_rate(client_country, service_type_id)
        vat_amount = subtotal * (vat_rate / 100)
        total_amount = subtotal + vat_amount

        # Step 8: Create Quote
        quote = RateQuote(
            client_id=client_id,
            rate_card_id=rate_card_id,
            agreement_id=agreement.id if agreement else None,
            origin_zone_id=origin_zone.id,
            destination_zone_id=destination_zone.id,
            service_type_id=service_type_id,
            total_weight_kg=total_weight_kg,
            total_volume_m3=total_volume_m3,
            total_loading_metres=total_loading_metres,
            chargeable_weight_kg=chargeable_weight,
            base_rate_applied=float(rate_line.rate),
            base_freight_amount=base_amount,
            surcharges=surcharges_applied,
            total_surcharges=total_surcharges,
            discount_applied=discount_applied,
            discount_amount=discount_amount,
            subtotal=subtotal,
            vat_rate=vat_rate,
            vat_amount=vat_amount,
            total_amount=total_amount,
            currency='EUR'
        )
        db.session.add(quote)
        db.session.commit()
        
        return quote
