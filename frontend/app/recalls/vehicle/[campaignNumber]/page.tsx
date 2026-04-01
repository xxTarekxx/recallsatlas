import type { Metadata } from "next";
import VehicleRecallPage from "@/components/vehicle/VehicleRecallPage";
import { buildVehicleRecallMetadata } from "@/lib/cars/vehicleRecallSeo";

interface PageProps {
  params: Promise<{ campaignNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignNumber } = await params;
  return buildVehicleRecallMetadata(campaignNumber, "en");
}

export default async function Page({ params }: PageProps) {
  const { campaignNumber } = await params;
  return <VehicleRecallPage campaignNumber={campaignNumber} lang="en" />;
}
