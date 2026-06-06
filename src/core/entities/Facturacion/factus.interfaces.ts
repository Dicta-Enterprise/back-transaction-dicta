
export interface FactusTokenResponse {
  access_token:  string;
  token_type:    string;
  expires_in:    number;
  refresh_token: string;
}

export interface FacturaElectronicaPayload {
  document:             string;
  numbering_range_id:   number;
  reference_code:       string;

  observation?:         string;

  payment_method_code:  string;

  payment_due_date?:    string;
  send_email?:         number;  
  email?:              string;   

  establishment: {
    name:            string;
    address:         string;
    phone_number:    string;
    email:           string;
  
    municipality_id: number;
  };

  customer: {
    identification:              string;
    dv?:                         string;
    company?:                    string;
    trade_name?:                 string;
    names:                       string;
    address:                     string;
    email:                       string;
    phone:                       string;
    legal_organization_id:       string;
    tribute_id:                  string;
    identification_document_id:  number;
    municipality_id?:            number;
  };

  items: FacturaItem[];
}

export interface FacturaItem {
  code_reference:    string;
  name:              string;
  quantity:          number;
  price:             number;
  discount_rate?:    number;
  unit_measure_id:   number;
  standard_code_id:  number;
  is_excluded:       number;  
  tax_rate:         number;
  tribute_id:        number;  
  withholding_taxes?: FacturaTax[];
}

export interface FacturaTax {
  code:       string;
  withholding_tax_rate: number;
}

export interface FactusFacturaResponse {
  status:  string;
  message: string;
  data: {
    bill:{
    id:         number;
    number:     string;
    cufe:       string;
    qr:         string;
    public_url?: string;
    pdf_base_64_encoded?: string;
    xml_base_64_encoded?: string;
    status:     string;
    created_at: string;
  };
};
}
