export type RecallItem = {
  campaignNumber: string;
  summary: string;
  remedy: string;
  consequence: string;
  component: string;
  reportDate: string;
  languages: string[];
  translations?: Record<
    string,
    { summary: string; remedy: string; consequence?: string; component?: string }
  >;
};

export type LookupResponse = {
  vehicle: {
    year: string;
    make: string;
    model: string;
  };
  recalls: RecallItem[];
};
