import { ManufacturerProductDocument } from "../models/ManufacturerProduct";
import { OurProductDocument } from "../models/OurProduct";
import { MatchStatus } from "../models/MatchResult";

/**
 * Turns a (possibly matched) our-product/manufacturer-product pair into the
 * final comparison status (spec sections 11-12). Matching identity and
 * status conflict resolution are kept separate: identity match is decided by
 * the matching engine's signal priority, this function only decides what the
 * pairing *means*.
 */
export function resolvePairStatus(
  mfgProduct: ManufacturerProductDocument,
  ourProduct: OurProductDocument | undefined
): { status: MatchStatus; note?: string } {
  if (!ourProduct) {
    return { status: "no_match", note: "Manufacturer product missing from our catalog" };
  }

  switch (mfgProduct.status) {
    case "discontinued":
      return {
        status: "discontinued",
        note: "Manufacturer lists this product as discontinued",
      };
    case "replacement":
      return {
        status: "replacement_available",
        note: mfgProduct.replacementMpn
          ? `Replacement MPN available: ${mfgProduct.replacementMpn}`
          : "Manufacturer indicates a replacement exists",
      };
    case "out_of_stock":
      return { status: "matched", note: "Manufacturer reports out of stock" };
    case "unknown":
      return { status: "needs_review", note: "Manufacturer status could not be determined" };
    case "active":
    default:
      return { status: "matched" };
  }
}

export interface ReplacementInfo {
  oldMpn: string;
  replacementMpn?: string;
  oldStatus: string;
  replacementExistsInOurCatalog: boolean;
  replacementExistsAtCompetitor: boolean;
}

export function buildReplacementInfo(
  mfgProduct: ManufacturerProductDocument,
  replacementFoundInOurCatalog: boolean,
  replacementFoundAtCompetitor: boolean
): ReplacementInfo | undefined {
  if (!mfgProduct.replacementMpn) return undefined;
  return {
    oldMpn: mfgProduct.mpn,
    replacementMpn: mfgProduct.replacementMpn,
    oldStatus: mfgProduct.status,
    replacementExistsInOurCatalog: replacementFoundInOurCatalog,
    replacementExistsAtCompetitor: replacementFoundAtCompetitor,
  };
}
