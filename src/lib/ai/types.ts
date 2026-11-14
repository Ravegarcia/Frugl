export type Hints = Partial<{
  brand: string;
  series: string;
  modelNumber: string;
  serialNumber: string;
  purchaseYear: number;
  ram: string;
  storage: string;
  cpu: string;
  gpu: string;
  notes: string;
}>;

export type VisionResult = {
  brand: string | null;
  series: string | null;
  modelNumber: string | null;
  visibleText: string[];
  confidence: number; // 0 to 1
  hintsUsed: string[];
};

// Every AI provider implements this one interface, so it can be swapped later.
export interface LaptopIdentifier {
  identify(input: { images: Buffer[]; hints?: Hints }): Promise<VisionResult>;
}
