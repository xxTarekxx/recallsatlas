/** CPSC general recall row for list UI and `/api/general-recalls` (no Node fs). */
export type GeneralRecallListItem = {
  slug: string;
  title: string;
  recallDate: string;
  summary: string;
  productType: string;
  brand: string;
  imageUrl: string | null;
  recallNumber: string;
};
