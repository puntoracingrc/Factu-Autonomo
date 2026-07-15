import {
  BookOpenCheck,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  LibraryBig,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  PublicAeatOfficialContentSourceV1,
  PublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages/official-content";
import { FiscalModel01Guide } from "./FiscalModel01Guide";
import { FiscalModelPracticalGuide } from "./FiscalModelPracticalGuide";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";
import {
  MODEL_038_GUIDE_V1,
  MODEL_039_GUIDE_V1,
  MODEL_043_GUIDE_V1,
  MODEL_044_GUIDE_V1,
  MODEL_045_GUIDE_V1,
} from "./model-batch-1-sectorial-guides.v1";
import {
  MODEL_102_GUIDE_V1,
  MODEL_113_GUIDE_V1,
  MODEL_136_GUIDE_V1,
  MODEL_146_GUIDE_V1,
  MODEL_147_GUIDE_V1,
  MODEL_150_GUIDE_V1,
} from "./model-batch-1-irpf-guides.v1";
import {
  MODEL_156_GUIDE_V1,
  MODEL_159_GUIDE_V1,
  MODEL_165_GUIDE_V1,
  MODEL_170_GUIDE_V1,
  MODEL_171_GUIDE_V1,
  MODEL_174_GUIDE_V1,
} from "./model-batch-1-specialized-information-guides.v1";
import {
  MODEL_181_GUIDE_V1,
  MODEL_182_GUIDE_V1,
  MODEL_185_GUIDE_V1,
  MODEL_186_GUIDE_V1,
  MODEL_189_GUIDE_V1,
  MODEL_192_GUIDE_V1,
  MODEL_195_GUIDE_V1,
  MODEL_198_GUIDE_V1,
  MODEL_199_GUIDE_V1,
} from "./model-batch-1-financial-social-guides.v1";
import {
  MODEL_206_GUIDE_V1,
  MODEL_213_GUIDE_V1,
  MODEL_217_GUIDE_V1,
  MODEL_220_GUIDE_V1,
} from "./model-batch-1-corporate-nonresident-guides.v1";
import {
  MODEL_221_GUIDE_V1,
  MODEL_222_GUIDE_V1,
  MODEL_237_GUIDE_V1,
} from "./model-batch-2-corporate-guides.v1";
import {
  MODEL_226_GUIDE_V1,
  MODEL_228_GUIDE_V1,
  MODEL_247_GUIDE_V1,
} from "./model-batch-2-nonresident-guides.v1";
import {
  MODEL_230_GUIDE_V1,
  MODEL_270_GUIDE_V1,
} from "./model-batch-2-lottery-guides.v1";
import {
  MODEL_231_GUIDE_V1,
  MODEL_234_GUIDE_V1,
  MODEL_235_GUIDE_V1,
  MODEL_236_GUIDE_V1,
  MODEL_239_GUIDE_V1,
} from "./model-batch-2-international-transparency-guides.v1";
import {
  MODEL_240_GUIDE_V1,
  MODEL_241_GUIDE_V1,
  MODEL_242_GUIDE_V1,
} from "./model-batch-2-pillar-two-guides.v1";
import {
  MODEL_280_GUIDE_V1,
  MODEL_289_GUIDE_V1,
  MODEL_290_GUIDE_V1,
  MODEL_291_GUIDE_V1,
  MODEL_294_GUIDE_V1,
  MODEL_295_GUIDE_V1,
} from "./model-batch-2-financial-international-guides.v1";
import {
  MODEL_281_GUIDE_V1,
  MODEL_282_GUIDE_V1,
  MODEL_283_GUIDE_V1,
} from "./model-batch-2-territorial-guides.v1";
import {
  MODEL_318_GUIDE_V1,
  MODEL_319_GUIDE_V1,
  MODEL_322_GUIDE_V1,
} from "./model-batch-2-specialized-vat-guides.v1";
import {
  MODEL_345_GUIDE_V1,
  MODEL_346_GUIDE_V1,
} from "./model-batch-2-social-agrarian-guides.v1";
import {
  MODEL_353_GUIDE_V1,
  MODEL_364_GUIDE_V1,
  MODEL_365_GUIDE_V1,
  MODEL_368_GUIDE_V1,
  MODEL_379_GUIDE_V1,
  MODEL_380_GUIDE_V1,
  MODEL_381_GUIDE_V1,
} from "./model-batch-3-vat-guides.v1";
import {
  MODEL_410_GUIDE_V1,
  MODEL_411_GUIDE_V1,
  MODEL_430_GUIDE_V1,
  MODEL_480_GUIDE_V1,
  MODEL_490_GUIDE_V1,
} from "./model-batch-3-sectorial-tax-guides.v1";
import {
  MODEL_504_GUIDE_V1,
  MODEL_505_GUIDE_V1,
  MODEL_506_GUIDE_V1,
  MODEL_507_GUIDE_V1,
  MODEL_508_GUIDE_V1,
  MODEL_510_GUIDE_V1,
  MODEL_512_GUIDE_V1,
} from "./model-batch-3-excise-movement-guides.v1";
import {
  MODEL_515_GUIDE_V1,
  MODEL_517_GUIDE_V1,
  MODEL_518_GUIDE_V1,
  MODEL_519_GUIDE_V1,
  MODEL_520_GUIDE_V1,
  MODEL_521_GUIDE_V1,
  MODEL_522_GUIDE_V1,
  MODEL_523_GUIDE_V1,
  MODEL_524_GUIDE_V1,
} from "./model-batch-3-excise-control-guides.v1";
import {
  MODEL_544_GUIDE_V1,
  MODEL_545_GUIDE_V1,
} from "./model-batch-3-fuel-guides.v1";
import { MODEL_01C_GUIDE_V1 } from "./model-01c-guide.v1";
import { MODEL_030_GUIDE_V1 } from "./model-030-guide.v1";
import { MODEL_035_GUIDE_V1 } from "./model-035-guide.v1";
import { MODEL_036_GUIDE_V1 } from "./model-036-guide.v1";
import { MODEL_037_GUIDE_V1 } from "./model-037-guide.v1";
import { MODEL_040_GUIDE_V1 } from "./model-040-guide.v1";
import { MODEL_04_GUIDE_V1 } from "./model-04-guide.v1";
import { MODEL_05_GUIDE_V1 } from "./model-05-guide.v1";
import { MODEL_06_GUIDE_V1 } from "./model-06-guide.v1";
import { MODEL_100_GUIDE_V1 } from "./model-100-guide.v1";
import { MODEL_111_GUIDE_V1 } from "./model-111-guide.v1";
import { MODEL_115_GUIDE_V1 } from "./model-115-guide.v1";
import { MODEL_117_GUIDE_V1 } from "./model-117-guide.v1";
import { MODEL_121_GUIDE_V1 } from "./model-121-guide.v1";
import { MODEL_122_GUIDE_V1 } from "./model-122-guide.v1";
import { MODEL_123_GUIDE_V1 } from "./model-123-guide.v1";
import { MODEL_124_GUIDE_V1 } from "./model-124-guide.v1";
import { MODEL_126_GUIDE_V1 } from "./model-126-guide.v1";
import { MODEL_128_GUIDE_V1 } from "./model-128-guide.v1";
import { MODEL_130_GUIDE_V1 } from "./model-130-guide.v1";
import { MODEL_131_GUIDE_V1 } from "./model-131-guide.v1";
import { MODEL_140_GUIDE_V1 } from "./model-140-guide.v1";
import { MODEL_143_GUIDE_V1 } from "./model-143-guide.v1";
import { MODEL_145_GUIDE_V1 } from "./model-145-guide.v1";
import { MODEL_149_GUIDE_V1 } from "./model-149-guide.v1";
import { MODEL_151_GUIDE_V1 } from "./model-151-guide.v1";
import { MODEL_172_GUIDE_V1 } from "./model-172-guide.v1";
import { MODEL_173_GUIDE_V1 } from "./model-173-guide.v1";
import { MODEL_179_GUIDE_V1 } from "./model-179-guide.v1";
import { MODEL_180_GUIDE_V1 } from "./model-180-guide.v1";
import { MODEL_184_GUIDE_V1 } from "./model-184-guide.v1";
import { MODEL_187_GUIDE_V1 } from "./model-187-guide.v1";
import { MODEL_188_GUIDE_V1 } from "./model-188-guide.v1";
import { MODEL_190_GUIDE_V1 } from "./model-190-guide.v1";
import { MODEL_193_GUIDE_V1 } from "./model-193-guide.v1";
import { MODEL_194_GUIDE_V1 } from "./model-194-guide.v1";
import { MODEL_196_GUIDE_V1 } from "./model-196-guide.v1";
import { MODEL_200_GUIDE_V1 } from "./model-200-guide.v1";
import { MODEL_202_GUIDE_V1 } from "./model-202-guide.v1";
import { MODEL_210_GUIDE_V1 } from "./model-210-guide.v1";
import { MODEL_211_GUIDE_V1 } from "./model-211-guide.v1";
import { MODEL_216_GUIDE_V1 } from "./model-216-guide.v1";
import { MODEL_232_GUIDE_V1 } from "./model-232-guide.v1";
import { MODEL_233_GUIDE_V1 } from "./model-233-guide.v1";
import { MODEL_238_GUIDE_V1 } from "./model-238-guide.v1";
import { MODEL_296_GUIDE_V1 } from "./model-296-guide.v1";
import { MODEL_303_GUIDE_V1 } from "./model-303-guide.v1";
import { MODEL_308_GUIDE_V1 } from "./model-308-guide.v1";
import { MODEL_309_GUIDE_V1 } from "./model-309-guide.v1";
import { MODEL_341_GUIDE_V1 } from "./model-341-guide.v1";
import { MODEL_347_GUIDE_V1 } from "./model-347-guide.v1";
import { MODEL_349_GUIDE_V1 } from "./model-349-guide.v1";
import { MODEL_360_GUIDE_V1 } from "./model-360-guide.v1";
import { MODEL_361_GUIDE_V1 } from "./model-361-guide.v1";
import { MODEL_369_GUIDE_V1 } from "./model-369-guide.v1";
import { MODEL_390_GUIDE_V1 } from "./model-390-guide.v1";
import { MODEL_714_GUIDE_V1 } from "./model-714-guide.v1";
import { MODEL_718_GUIDE_V1 } from "./model-718-guide.v1";
import { MODEL_720_GUIDE_V1 } from "./model-720-guide.v1";
import { MODEL_721_GUIDE_V1 } from "./model-721-guide.v1";
import { MODEL_840_GUIDE_V1 } from "./model-840-guide.v1";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const BATCH_1_PRACTICAL_GUIDES_BY_CODE: Readonly<
  Record<string, FiscalModelPracticalGuideV1>
> = Object.freeze({
  "038": MODEL_038_GUIDE_V1,
  "039": MODEL_039_GUIDE_V1,
  "043": MODEL_043_GUIDE_V1,
  "044": MODEL_044_GUIDE_V1,
  "045": MODEL_045_GUIDE_V1,
  "102": MODEL_102_GUIDE_V1,
  "113": MODEL_113_GUIDE_V1,
  "136": MODEL_136_GUIDE_V1,
  "146": MODEL_146_GUIDE_V1,
  "147": MODEL_147_GUIDE_V1,
  "150": MODEL_150_GUIDE_V1,
  "156": MODEL_156_GUIDE_V1,
  "159": MODEL_159_GUIDE_V1,
  "165": MODEL_165_GUIDE_V1,
  "170": MODEL_170_GUIDE_V1,
  "171": MODEL_171_GUIDE_V1,
  "174": MODEL_174_GUIDE_V1,
  "181": MODEL_181_GUIDE_V1,
  "182": MODEL_182_GUIDE_V1,
  "185": MODEL_185_GUIDE_V1,
  "186": MODEL_186_GUIDE_V1,
  "189": MODEL_189_GUIDE_V1,
  "192": MODEL_192_GUIDE_V1,
  "195": MODEL_195_GUIDE_V1,
  "198": MODEL_198_GUIDE_V1,
  "199": MODEL_199_GUIDE_V1,
  "206": MODEL_206_GUIDE_V1,
  "213": MODEL_213_GUIDE_V1,
  "217": MODEL_217_GUIDE_V1,
  "220": MODEL_220_GUIDE_V1,
});

const BATCH_2_PRACTICAL_GUIDES_BY_CODE: Readonly<
  Record<string, FiscalModelPracticalGuideV1>
> = Object.freeze({
  "221": MODEL_221_GUIDE_V1,
  "222": MODEL_222_GUIDE_V1,
  "226": MODEL_226_GUIDE_V1,
  "228": MODEL_228_GUIDE_V1,
  "230": MODEL_230_GUIDE_V1,
  "231": MODEL_231_GUIDE_V1,
  "234": MODEL_234_GUIDE_V1,
  "235": MODEL_235_GUIDE_V1,
  "236": MODEL_236_GUIDE_V1,
  "237": MODEL_237_GUIDE_V1,
  "239": MODEL_239_GUIDE_V1,
  "240": MODEL_240_GUIDE_V1,
  "241": MODEL_241_GUIDE_V1,
  "242": MODEL_242_GUIDE_V1,
  "247": MODEL_247_GUIDE_V1,
  "270": MODEL_270_GUIDE_V1,
  "280": MODEL_280_GUIDE_V1,
  "281": MODEL_281_GUIDE_V1,
  "282": MODEL_282_GUIDE_V1,
  "283": MODEL_283_GUIDE_V1,
  "289": MODEL_289_GUIDE_V1,
  "290": MODEL_290_GUIDE_V1,
  "291": MODEL_291_GUIDE_V1,
  "294": MODEL_294_GUIDE_V1,
  "295": MODEL_295_GUIDE_V1,
  "318": MODEL_318_GUIDE_V1,
  "319": MODEL_319_GUIDE_V1,
  "322": MODEL_322_GUIDE_V1,
  "345": MODEL_345_GUIDE_V1,
  "346": MODEL_346_GUIDE_V1,
});

const BATCH_3_PRACTICAL_GUIDES_BY_CODE: Readonly<
  Record<string, FiscalModelPracticalGuideV1>
> = Object.freeze({
  "353": MODEL_353_GUIDE_V1,
  "364": MODEL_364_GUIDE_V1,
  "365": MODEL_365_GUIDE_V1,
  "368": MODEL_368_GUIDE_V1,
  "379": MODEL_379_GUIDE_V1,
  "380": MODEL_380_GUIDE_V1,
  "381": MODEL_381_GUIDE_V1,
  "410": MODEL_410_GUIDE_V1,
  "411": MODEL_411_GUIDE_V1,
  "430": MODEL_430_GUIDE_V1,
  "480": MODEL_480_GUIDE_V1,
  "490": MODEL_490_GUIDE_V1,
  "504": MODEL_504_GUIDE_V1,
  "505": MODEL_505_GUIDE_V1,
  "506": MODEL_506_GUIDE_V1,
  "507": MODEL_507_GUIDE_V1,
  "508": MODEL_508_GUIDE_V1,
  "510": MODEL_510_GUIDE_V1,
  "512": MODEL_512_GUIDE_V1,
  "515": MODEL_515_GUIDE_V1,
  "517": MODEL_517_GUIDE_V1,
  "518": MODEL_518_GUIDE_V1,
  "519": MODEL_519_GUIDE_V1,
  "520": MODEL_520_GUIDE_V1,
  "521": MODEL_521_GUIDE_V1,
  "522": MODEL_522_GUIDE_V1,
  "523": MODEL_523_GUIDE_V1,
  "524": MODEL_524_GUIDE_V1,
  "544": MODEL_544_GUIDE_V1,
  "545": MODEL_545_GUIDE_V1,
});

function ExternalOfficialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
    >
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}

function sourceById(
  content: PublicAeatOfficialModelContentV1,
  sourceId: string,
): PublicAeatOfficialContentSourceV1 {
  const source = content.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Missing official source: ${sourceId}`);
  return source;
}

export function FiscalModelOfficialContentView({
  content,
}: {
  content: PublicAeatOfficialModelContentV1;
}) {
  if (content.code === "01") {
    return <FiscalModel01Guide content={content} />;
  }

  const batch1Guide = BATCH_1_PRACTICAL_GUIDES_BY_CODE[content.code];
  if (batch1Guide) {
    return <FiscalModelPracticalGuide content={content} guide={batch1Guide} />;
  }

  const batch2Guide = BATCH_2_PRACTICAL_GUIDES_BY_CODE[content.code];
  if (batch2Guide) {
    return <FiscalModelPracticalGuide content={content} guide={batch2Guide} />;
  }

  const batch3Guide = BATCH_3_PRACTICAL_GUIDES_BY_CODE[content.code];
  if (batch3Guide) {
    return <FiscalModelPracticalGuide content={content} guide={batch3Guide} />;
  }

  if (content.code === "01C") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_01C_GUIDE_V1} />
    );
  }

  if (content.code === "030") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_030_GUIDE_V1} />
    );
  }

  if (content.code === "035") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_035_GUIDE_V1} />
    );
  }

  if (content.code === "036") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_036_GUIDE_V1} />
    );
  }

  if (content.code === "037") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_037_GUIDE_V1} />
    );
  }

  if (content.code === "040") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_040_GUIDE_V1} />
    );
  }

  if (content.code === "04") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_04_GUIDE_V1} />
    );
  }

  if (content.code === "05") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_05_GUIDE_V1} />
    );
  }

  if (content.code === "06") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_06_GUIDE_V1} />
    );
  }

  if (content.code === "100") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_100_GUIDE_V1} />
    );
  }

  if (content.code === "111") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_111_GUIDE_V1} />
    );
  }

  if (content.code === "115") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_115_GUIDE_V1} />
    );
  }

  if (content.code === "117") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_117_GUIDE_V1} />
    );
  }

  if (content.code === "121") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_121_GUIDE_V1} />
    );
  }

  if (content.code === "122") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_122_GUIDE_V1} />
    );
  }

  if (content.code === "123") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_123_GUIDE_V1} />
    );
  }

  if (content.code === "124") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_124_GUIDE_V1} />
    );
  }

  if (content.code === "126") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_126_GUIDE_V1} />
    );
  }

  if (content.code === "128") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_128_GUIDE_V1} />
    );
  }

  if (content.code === "130") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_130_GUIDE_V1} />
    );
  }

  if (content.code === "131") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_131_GUIDE_V1} />
    );
  }

  if (content.code === "140") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_140_GUIDE_V1} />
    );
  }

  if (content.code === "143") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_143_GUIDE_V1} />
    );
  }

  if (content.code === "145") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_145_GUIDE_V1} />
    );
  }

  if (content.code === "149") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_149_GUIDE_V1} />
    );
  }

  if (content.code === "151") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_151_GUIDE_V1} />
    );
  }

  if (content.code === "172") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_172_GUIDE_V1} />
    );
  }

  if (content.code === "173") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_173_GUIDE_V1} />
    );
  }

  if (content.code === "179") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_179_GUIDE_V1} />
    );
  }

  if (content.code === "180") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_180_GUIDE_V1} />
    );
  }

  if (content.code === "184") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_184_GUIDE_V1} />
    );
  }

  if (content.code === "187") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_187_GUIDE_V1} />
    );
  }

  if (content.code === "188") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_188_GUIDE_V1} />
    );
  }

  if (content.code === "190") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_190_GUIDE_V1} />
    );
  }

  if (content.code === "193") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_193_GUIDE_V1} />
    );
  }

  if (content.code === "194") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_194_GUIDE_V1} />
    );
  }

  if (content.code === "196") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_196_GUIDE_V1} />
    );
  }

  if (content.code === "200") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_200_GUIDE_V1} />
    );
  }

  if (content.code === "202") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_202_GUIDE_V1} />
    );
  }

  if (content.code === "210") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_210_GUIDE_V1} />
    );
  }

  if (content.code === "211") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_211_GUIDE_V1} />
    );
  }

  if (content.code === "216") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_216_GUIDE_V1} />
    );
  }

  if (content.code === "232") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_232_GUIDE_V1} />
    );
  }

  if (content.code === "233") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_233_GUIDE_V1} />
    );
  }

  if (content.code === "238") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_238_GUIDE_V1} />
    );
  }

  if (content.code === "296") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_296_GUIDE_V1} />
    );
  }

  if (content.code === "303") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_303_GUIDE_V1} />
    );
  }

  if (content.code === "308") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_308_GUIDE_V1} />
    );
  }

  if (content.code === "309") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_309_GUIDE_V1} />
    );
  }

  if (content.code === "341") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_341_GUIDE_V1} />
    );
  }

  if (content.code === "347") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_347_GUIDE_V1} />
    );
  }

  if (content.code === "349") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_349_GUIDE_V1} />
    );
  }

  if (content.code === "360") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_360_GUIDE_V1} />
    );
  }

  if (content.code === "361") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_361_GUIDE_V1} />
    );
  }

  if (content.code === "369") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_369_GUIDE_V1} />
    );
  }

  if (content.code === "390") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_390_GUIDE_V1} />
    );
  }

  if (content.code === "714") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_714_GUIDE_V1} />
    );
  }

  if (content.code === "718") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_718_GUIDE_V1} />
    );
  }

  if (content.code === "720") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_720_GUIDE_V1} />
    );
  }

  if (content.code === "721") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_721_GUIDE_V1} />
    );
  }

  if (content.code === "840") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_840_GUIDE_V1} />
    );
  }

  const procedureLinks = content.links.filter(
    (link) => link.category === "PROCEDURE",
  );
  const informationLinks = content.links.filter(
    (link) => link.category === "INFORMATION",
  );
  const legalLinks = content.links.filter((link) => link.category === "LEGAL");

  return (
    <div className="space-y-6">
      {content.sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          aria-labelledby={`official-section-${content.code}-${section.id}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            {sectionIndex === 0 ? (
              <BookOpenCheck
                className="h-5 w-5 text-blue-700 dark:text-blue-300"
                aria-hidden="true"
              />
            ) : (
              <Globe2
                className="h-5 w-5 text-blue-700 dark:text-blue-300"
                aria-hidden="true"
              />
            )}
            <h2
              id={`official-section-${content.code}-${section.id}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              {section.title}
            </h2>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <Card
                key={item.id}
                className="dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {item.heading}
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {item.text}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {content.documents.length > 0 && (
        <section
          aria-labelledby={`official-documents-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <FileText
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-documents-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Documentos oficiales
            </h2>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {content.documents.map((document) => {
              const source = sourceById(content, document.sourceId);
              return (
                <Card
                  key={document.id}
                  className="flex min-w-0 flex-col dark:border-slate-700 dark:bg-slate-900"
                >
                  <h3 className="break-words font-bold text-slate-950 dark:text-slate-100">
                    {document.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    PDF · {document.pageCount}{" "}
                    {document.pageCount === 1 ? "página" : "páginas"}
                  </p>
                  <div className="mt-auto pt-3">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Descargar documento oficial
                    </ExternalOfficialLink>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            Los documentos se abren en la sede oficial que los publica. No se
            ejecutan ni se incrustan en esta web.
          </p>
        </section>
      )}

      {(informationLinks.length > 0 || procedureLinks.length > 0) && (
        <section
          aria-labelledby={`official-information-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <LibraryBig
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-information-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Información, ayuda y procedimiento
            </h2>
          </div>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <ul className="grid min-w-0 gap-2 md:grid-cols-2">
              {[...informationLinks, ...procedureLinks].map((link) => {
                const source = sourceById(content, link.sourceId);
                return (
                  <li key={link.id} className="min-w-0">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      {link.label}
                    </ExternalOfficialLink>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      {legalLinks.length > 0 && (
        <section
          aria-labelledby={`official-law-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Landmark
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-law-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Normativa
            </h2>
          </div>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <ul className="grid min-w-0 gap-2 md:grid-cols-2">
              {legalLinks.map((link) => {
                const source = sourceById(content, link.sourceId);
                return (
                  <li key={link.id} className="min-w-0">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      {link.label}
                    </ExternalOfficialLink>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      <section
        aria-labelledby={`official-faq-${content.code}`}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <BookOpenCheck
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id={`official-faq-${content.code}`}
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Preguntas frecuentes
          </h2>
        </div>
        <div className="space-y-3">
          {content.faq.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-blue-300 open:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:open:border-blue-800 dark:open:bg-blue-950/20"
            >
              <summary
                className={`cursor-pointer list-none rounded font-bold text-slate-950 dark:text-slate-100 ${focusRing}`}
              >
                {item.question}
              </summary>
              <p className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {content.externalNavigation && (
        <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Acceso externo a la AEAT
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Este enlace abre el área personal general de la AEAT. Factu no
            inicia ningún trámite ni envía datos al abrirlo.
          </p>
          <div className="mt-3">
            <ExternalOfficialLink
              href={
                sourceById(content, content.externalNavigation.sourceId)
                  .canonicalUrl
              }
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Abrir Mi área personal de la AEAT
            </ExternalOfficialLink>
          </div>
        </Card>
      )}

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <summary
          className={`cursor-pointer font-semibold text-slate-800 dark:text-slate-200 ${focusRing}`}
        >
          Fuentes y trazabilidad
        </summary>
        <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
          <div>
            <dt className="font-semibold">Release de contenido</dt>
            <dd className="mt-1 break-all">{content.releaseId}</dd>
          </div>
          <div>
            <dt className="font-semibold">Fuentes contrastadas el</dt>
            <dd className="mt-1">{content.reviewedOn}</dd>
          </div>
          <div>
            <dt className="font-semibold">Fuentes oficiales registradas</dt>
            <dd className="mt-1">{content.sources.length}</dd>
          </div>
          <div>
            <dt className="font-semibold">Aplicación a un caso concreto</dt>
            <dd className="mt-1">No evaluada</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {content.limitations}
        </p>
      </details>
    </div>
  );
}
