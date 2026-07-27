import type { GruppenKey } from "./gruppenZuordnung";
import { atemwegeCluster } from "./atemwegeCluster";
import { herzCluster } from "./herzCluster";
import { nervenCluster } from "./nervenCluster";
import { niereCluster } from "./niereCluster";
import { stoffwechselCluster } from "./stoffwechselCluster";
import { verdauungCluster } from "./verdauungCluster";

export type ClusterDefinition = {
  title: string;
  slugs: readonly string[];
};

export const clusterRegistry: Partial<
  Record<GruppenKey, readonly ClusterDefinition[]>
> = {
  herz: herzCluster,
  atmung: atemwegeCluster,
  verdauung: verdauungCluster,
  stoffwechsel: stoffwechselCluster,
  niere: niereCluster,
  nerven: nervenCluster,
};