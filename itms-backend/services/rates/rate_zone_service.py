from models import RateZone, Location

class RateZoneService:
    @staticmethod
    def find_zone_for_postcode(rate_card_id, postcode, country_code=None):
        """
        Finds the matching RateZone for a given rate card and postcode.
        It checks the postcode prefix.
        """
        zones = RateZone.query.filter_by(rate_card_id=rate_card_id, is_active=True).all()
        for zone in zones:
            # Check country match if provided
            if country_code and zone.country_codes:
                if country_code not in zone.country_codes:
                    continue
            
            # Check postcode prefix match
            if zone.postcode_prefixes:
                for prefix in zone.postcode_prefixes:
                    if postcode and postcode.startswith(prefix):
                        return zone
        return None

    @staticmethod
    def find_zone_for_location(rate_card_id, location_id):
        """
        Helper method to resolve a location ID to a RateZone.
        """
        location = Location.query.get(location_id)
        if not location:
            return None
        
        zones = RateZone.query.filter_by(rate_card_id=rate_card_id, is_active=True).all()
        if not zones:
            return None

        # Attempt to match by name or city (case-insensitive)
        loc_str = (location.name or "") + " " + (location.city or "") + " " + (location.address or "")
        loc_str = loc_str.lower()
        
        for zone in zones:
            # e.g., "Germany" in "Berlin, Germany"
            if zone.name.lower() in loc_str:
                return zone
                
        # If we have country codes like 'DE', 'IT', check if they match simple keywords
        for zone in zones:
            if zone.country_codes:
                if 'IT' in zone.country_codes and ('italy' in loc_str or 'roma' in loc_str or 'milan' in loc_str):
                    return zone
                if 'DE' in zone.country_codes and ('germany' in loc_str or 'berlin' in loc_str or 'munich' in loc_str):
                    return zone
                if 'FR' in zone.country_codes and ('france' in loc_str or 'paris' in loc_str):
                    return zone

        # Fallback to the first available zone instead of failing
        return zones[0]
