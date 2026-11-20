class VATService:
    @staticmethod
    def get_rate(country_code, service_type_id=None):
        """
        Returns the appropriate VAT rate based on country.
        For MVP, we apply a standard 22% rate for IT (Italy) and 0% for others (Export/Reverse Charge).
        """
        if country_code and country_code.upper() == 'IT':
            return 22.0
        return 0.0
