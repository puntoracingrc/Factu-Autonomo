import {
  resolvePublicAeatModelCalendarNavigationV1,
  resolvePublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages";
import { isCanonicalFiscalCalendarModelPageLink } from "./model-reference-links";
import type { FiscalCalendarModelPageLink } from "./types";

assertServerOnlyModule();

const MODEL_CODE = /^(?:\d{2}[A-Z]|[A-Z]\d{2}|\d{2,3})$/;
const CATALOG_CARD_ID = /^modelo-((?:\d{2}[A-Z]|[A-Z]\d{2}|\d{2,3}))$/;
const REVIEW_HREF =
  /^\/consultor-fiscal\/modelos\/((?:\d{2}[A-Z]|[A-Z]\d{2}|\d{2,3}))$/;
const DETAIL_FROM_CALENDAR_HREF =
  /^\/consultor-fiscal\/modelos\/((?:\d{2}[A-Z]|[A-Z]\d{2}|\d{2,3}))\?origen=calendario$/;

function assertServerOnlyModule(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador Calendario-Modelos solo puede cargarse en servidor.",
    );
  }
}

function dataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function capturedCode(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" ? (pattern.exec(value)?.[1] ?? null) : null;
}

export function buildFiscalCalendarModelPageLinkFromResolverResults(input: {
  code: string;
  navigation: unknown;
  reviewPage: unknown;
}): FiscalCalendarModelPageLink | null {
  try {
    if (!MODEL_CODE.test(input.code)) return null;
    const navigation = dataRecord(input.navigation);
    const reviewPage = dataRecord(input.reviewPage);
    if (
      navigation?.status !== "REVIEW_ONLY" ||
      reviewPage?.status !== "REVIEW_ONLY"
    ) {
      return null;
    }

    const navigationData = dataRecord(navigation.data);
    const reviewData = dataRecord(reviewPage.data);
    if (!navigationData || !reviewData) return null;
    if (
      navigation.catalogFocusHref !== navigationData.catalogFocusHref ||
      navigation.detailHref !== navigationData.detailHref ||
      reviewPage.href !== reviewData.href ||
      reviewData.reviewPagePath !== reviewData.href ||
      navigationData.code !== input.code ||
      reviewData.code !== input.code ||
      navigationData.routeDeploymentStatus !== "DEPLOYED" ||
      reviewData.routeDeploymentStatus !== "DEPLOYED" ||
      navigationData.origin !== "FISCAL_CALENDAR" ||
      navigationData.originQueryValue !== "calendario" ||
      navigationData.returnHref !== "/consultor-fiscal/calendario" ||
      navigationData.catalogCardId !== reviewData.catalogCardId ||
      capturedCode(navigationData.catalogCardId, CATALOG_CARD_ID) !==
        input.code ||
      capturedCode(reviewData.href, REVIEW_HREF) !== input.code ||
      capturedCode(navigationData.detailHref, DETAIL_FROM_CALENDAR_HREF) !==
        input.code ||
      (reviewData.lifecycleStatus !== "UNDETERMINED" &&
        reviewData.lifecycleStatus !== "HISTORICAL")
    ) {
      return null;
    }

    const link: FiscalCalendarModelPageLink = {
      code: input.code,
      href: navigationData.catalogFocusHref as string,
      historical: reviewData.lifecycleStatus === "HISTORICAL",
    };
    return isCanonicalFiscalCalendarModelPageLink(link)
      ? Object.freeze(link)
      : null;
  } catch {
    return null;
  }
}

export function resolveFiscalCalendarModelPageLinkServer(
  code: string,
): FiscalCalendarModelPageLink | null {
  try {
    return buildFiscalCalendarModelPageLinkFromResolverResults({
      code,
      navigation: resolvePublicAeatModelCalendarNavigationV1({ code }),
      reviewPage: resolvePublicAeatModelReviewPageV1({ code }),
    });
  } catch {
    return null;
  }
}
