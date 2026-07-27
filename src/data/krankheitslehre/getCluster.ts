export type ClusterDefinition = {
  title: string;
  slugs: readonly string[];
  [key: string]: unknown;
};

export const getCluster = <
  T extends { slug: string },
  C extends ClusterDefinition,
>(
  items: T[],
  clusterDefinition: readonly C[],
) => {
  return clusterDefinition
    .map((cluster) => ({
      ...cluster,
      items: items.filter((topic) =>
        cluster.slugs.some((slug) =>
          topic.slug.toLowerCase().includes(slug.toLowerCase()),
        ),
      ),
    }))
    .filter((cluster) => cluster.items.length > 0);
};