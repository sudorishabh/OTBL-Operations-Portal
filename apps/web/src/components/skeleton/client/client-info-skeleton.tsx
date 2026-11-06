import React from "react";
import { DetailCardSkeleton, SkeletonRegion } from "../parts";

// Mirrors ClientDetailsCard: identity, four figures, then the fields with
// the address spanning two columns.
const ClientInfoSkeleton = () => (
  <SkeletonRegion label='Loading client'>
    <DetailCardSkeleton
      pills={1}
      buttons={1}
      metrics={4}
      metricsClassName='lg:grid-cols-4 lg:divide-y-0'
      fields={["", "", "", "", "col-span-2"]}
      fieldsClassName='sm:grid-cols-4 xl:grid-cols-6'
    />
  </SkeletonRegion>
);

export default ClientInfoSkeleton;
