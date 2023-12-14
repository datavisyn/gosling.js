var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { bisector } from "d3-array";
import { RemoteFile as RemoteFile$1 } from "generic-filehandle";
const CHROM_SIZE_HG38 = {
  chr1: 248956422,
  chr2: 242193529,
  chr3: 198295559,
  chr4: 190214555,
  chr5: 181538259,
  chr6: 170805979,
  chr7: 159345973,
  chr8: 145138636,
  chr9: 138394717,
  chr10: 133797422,
  chr11: 135086622,
  chr12: 133275309,
  chr13: 114364328,
  chr14: 107043718,
  chr15: 101991189,
  chr16: 90338345,
  chr17: 83257441,
  chr18: 80373285,
  chr19: 58617616,
  chr20: 64444167,
  chr21: 46709983,
  chr22: 50818468,
  chrX: 156040895,
  chrY: 57227415
};
const CHROM_SIZE_HG19 = {
  chr1: 249250621,
  chr2: 243199373,
  chr3: 198022430,
  chr4: 191154276,
  chr5: 180915260,
  chr6: 171115067,
  chr7: 159138663,
  chr8: 146364022,
  chr9: 141213431,
  chr10: 135534747,
  chr11: 135006516,
  chr12: 133851895,
  chr13: 115169878,
  chr14: 107349540,
  chr15: 102531392,
  chr16: 90354753,
  chr17: 81195210,
  chr18: 78077248,
  chr19: 59128983,
  chr20: 63025520,
  chr21: 48129895,
  chr22: 51304566,
  chrX: 155270560,
  chrY: 59373566,
  chrM: 16571
};
const CHROM_SIZE_HG18 = {
  chr1: 247249719,
  chr2: 242951149,
  chr3: 199501827,
  chr4: 191273063,
  chr5: 180857866,
  chr6: 170899992,
  chr7: 158821424,
  chr8: 146274826,
  chr9: 140273252,
  chr10: 135374737,
  chr11: 134452384,
  chr12: 132349534,
  chr13: 114142980,
  chr14: 106368585,
  chr15: 100338915,
  chr16: 88827254,
  chr17: 78774742,
  chr18: 76117153,
  chr19: 63811651,
  chr20: 62435964,
  chr21: 46944323,
  chr22: 49691432,
  chrX: 154913754,
  chrY: 57772954,
  chrM: 16571
};
const CHROM_SIZE_HG17 = {
  chr1: 245522847,
  chr2: 243018229,
  chr3: 199505740,
  chr4: 191411218,
  chr5: 180857866,
  chr6: 170975699,
  chr7: 158628139,
  chr8: 146274826,
  chr9: 138429268,
  chr10: 135413628,
  chr11: 134452384,
  chr12: 132449811,
  chr13: 114142980,
  chr14: 106368585,
  chr15: 100338915,
  chr16: 88827254,
  chr17: 78774742,
  chr18: 76117153,
  chr19: 63811651,
  chr20: 62435964,
  chr21: 46944323,
  chr22: 49554710,
  chrX: 154824264,
  chrY: 57701691,
  chrM: 16571
};
const CHROM_SIZE_HG16 = {
  chr1: 246127941,
  chr2: 243615958,
  chr3: 199344050,
  chr4: 191731959,
  chr5: 181034922,
  chr6: 170914576,
  chr7: 158545518,
  chr8: 146308819,
  chr9: 136372045,
  chr10: 135037215,
  chr11: 134482954,
  chr12: 132078379,
  chr13: 113042980,
  chr14: 105311216,
  chr15: 100256656,
  chr16: 90041932,
  chr17: 81860266,
  chr18: 76115139,
  chr19: 63811651,
  chr20: 63741868,
  chr21: 46976097,
  chr22: 49396972,
  chrX: 153692391,
  chrY: 50286555,
  chrM: 16571
};
const CHROM_SIZE_MM10 = {
  chr1: 195471971,
  chr2: 182113224,
  chr3: 160039680,
  chr4: 156508116,
  chr5: 151834684,
  chr6: 149736546,
  chr7: 145441459,
  chr8: 129401213,
  chr9: 124595110,
  chr10: 130694993,
  chr11: 122082543,
  chr12: 120129022,
  chr13: 120421639,
  chr14: 124902244,
  chr15: 104043685,
  chr16: 98207768,
  chr17: 94987271,
  chr18: 90702639,
  chr19: 61431566,
  chrX: 171031299,
  chrY: 91744698,
  chrM: 16299
};
const CHROM_SIZE_MM9 = {
  chr1: 197195432,
  chr2: 181748087,
  chr3: 159599783,
  chr4: 155630120,
  chr5: 152537259,
  chr6: 149517037,
  chr7: 152524553,
  chr8: 131738871,
  chr9: 124076172,
  chr10: 129993255,
  chr11: 121843856,
  chr12: 121257530,
  chr13: 120284312,
  chr14: 125194864,
  chr15: 103494974,
  chr16: 98319150,
  chr17: 95272651,
  chr18: 90772031,
  chr19: 61342430,
  chrX: 166650296,
  chrY: 15902555,
  chrM: 16299
};
function getRelativeGenomicPosition(absPos, assembly, returnWithinAssembly = false) {
  const chrSizes = Object.entries(computeChromSizes(assembly).interval);
  const minPosChr = { chromosome: "unknown", position: Infinity };
  const maxPosChr = { chromosome: "unknown", position: 0 };
  for (const chrSize of chrSizes) {
    const [chromosome, absInterval] = chrSize;
    const [start, end] = absInterval;
    if (start <= absPos && absPos < end) {
      return { chromosome, position: absPos - start };
    }
    if (start < minPosChr.position) {
      minPosChr.chromosome = chromosome;
      minPosChr.position = start;
    }
    if (end > maxPosChr.position) {
      maxPosChr.chromosome = chromosome;
      maxPosChr.position = end;
    }
  }
  if (returnWithinAssembly) {
    if (absPos < minPosChr.position) {
      return minPosChr;
    } else {
      return maxPosChr;
    }
  } else {
    return { chromosome: "unknown", position: absPos };
  }
}
function createChromSizesUrl(chromSizes) {
  const text = chromSizes.map((d) => d.join("	")).join("\n");
  const tsv = new Blob([text], { type: "text/tsv" });
  return URL.createObjectURL(tsv);
}
function computeChromSizes(assembly) {
  if (assembly && typeof assembly === "string" && assembly in CRHOM_SIZES) {
    return CRHOM_SIZES[assembly];
  } else if (Array.isArray(assembly) && assembly.length !== 0) {
    const size = Object.fromEntries(assembly);
    return {
      size,
      interval: getChromInterval(size),
      total: getChromTotalSize(size),
      path: createChromSizesUrl(assembly)
    };
  } else {
    return CRHOM_SIZES.hg38;
  }
}
const basePath = (assembly) => `https://s3.amazonaws.com/gosling-lang.org/data/${assembly}.chrom.sizes`;
const CRHOM_SIZES = Object.freeze({
  hg38: {
    size: CHROM_SIZE_HG38,
    interval: getChromInterval(CHROM_SIZE_HG38),
    total: getChromTotalSize(CHROM_SIZE_HG38),
    path: basePath("hg38")
  },
  hg19: {
    size: CHROM_SIZE_HG19,
    interval: getChromInterval(CHROM_SIZE_HG19),
    total: getChromTotalSize(CHROM_SIZE_HG19),
    path: basePath("hg19")
  },
  hg18: {
    size: CHROM_SIZE_HG18,
    interval: getChromInterval(CHROM_SIZE_HG18),
    total: getChromTotalSize(CHROM_SIZE_HG18),
    path: basePath("hg18")
  },
  hg17: {
    size: CHROM_SIZE_HG17,
    interval: getChromInterval(CHROM_SIZE_HG17),
    total: getChromTotalSize(CHROM_SIZE_HG17),
    path: basePath("hg17")
  },
  hg16: {
    size: CHROM_SIZE_HG16,
    interval: getChromInterval(CHROM_SIZE_HG16),
    total: getChromTotalSize(CHROM_SIZE_HG16),
    path: basePath("hg16")
  },
  mm10: {
    size: CHROM_SIZE_MM10,
    interval: getChromInterval(CHROM_SIZE_MM10),
    total: getChromTotalSize(CHROM_SIZE_MM10),
    path: basePath("mm10")
  },
  mm9: {
    size: CHROM_SIZE_MM9,
    interval: getChromInterval(CHROM_SIZE_MM9),
    total: getChromTotalSize(CHROM_SIZE_MM9),
    path: basePath("mm9")
  },
  // `unknown` assembly contains only one chromosome with max length
  unknown: {
    size: { chr: Number.MAX_VALUE },
    interval: { chr: [0, Number.MAX_VALUE] },
    total: Number.MAX_VALUE,
    path: basePath("hg38")
    // just to ensure this does not make crash
  }
});
function getAutoCompleteId(assembly) {
  switch (assembly) {
    case "hg19":
      return "OHJakQICQD6gTD7skx4EWA";
    case "mm10":
      return "QDutvmyiSrec5nX4pA5WGQ";
    case "mm9":
      return "GUm5aBiLRCyz2PsBea7Yzg";
    case "hg38":
    default:
      return "P0PLbQMwTYGy-5uPIQid7A";
  }
}
function getChromInterval(chromSize) {
  const interval = {};
  Object.keys(chromSize).reduce((sum, k) => {
    interval[k] = [sum, sum + chromSize[k]];
    return sum + chromSize[k];
  }, 0);
  return interval;
}
function getChromTotalSize(chromSize) {
  return Object.values(chromSize).reduce((sum, current) => sum + current, 0);
}
function parseGenomicPosition(position) {
  const [chromosome, intervalString] = position.split(":");
  if (intervalString) {
    const [start, end] = intervalString.split("-").map((s) => +s.replace(/,/g, ""));
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      return { chromosome, start, end };
    }
  }
  return { chromosome };
}
class GenomicPositionHelper {
  constructor(chromosome, start, end) {
    this.chromosome = chromosome;
    this.start = start;
    this.end = end;
  }
  static fromString(str) {
    const result = parseGenomicPosition(str);
    return new GenomicPositionHelper(result.chromosome, result.start, result.end);
  }
  toAbsoluteCoordinates(assembly, padding = 0) {
    const info = computeChromSizes(assembly);
    const size = info.size[this.chromosome];
    const interval = info.interval[this.chromosome];
    if (size === void 0 || interval === void 0) {
      throw new Error(`Chromosome name ${this.chromosome} is not valid`);
    }
    let { start, end } = this;
    if (start === void 0 || end === void 0) {
      [start, end] = [1, size];
    }
    const offset = interval[0];
    return [start + offset - padding, end + offset + padding];
  }
}
function filterUsingGenoPos(data, [minX, maxX], config) {
  const { x, xe, x1, x1e } = config;
  const definedXFields = [x, xe, x1, x1e].filter((f) => f);
  return data.filter((d) => {
    if (definedXFields.length === 0) {
      return true;
    } else if (definedXFields.length === 1) {
      const value = +d[definedXFields[0]];
      return typeof value === "number" && minX < value && value <= maxX;
    } else {
      const values = definedXFields.map((f) => +d[f]).filter((v) => !isNaN(v));
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      return minX <= maxValue && minValue <= maxX;
    }
  });
}
bisector((d) => d.pos).left;
function sanitizeChrName(chrName, assembly, chromosomePrefix) {
  if (Array.isArray(assembly)) {
    return chrName;
  }
  if (chromosomePrefix) {
    chrName = chrName.replace(chromosomePrefix, "chr");
  } else if (!chrName.includes("chr")) {
    chrName = `chr${chrName}`;
  }
  return chrName;
}
class RemoteFile extends RemoteFile$1 {
  constructor() {
    super(...arguments);
    // Overrides `read` to eagerly read 200 or 206 response
    // from https://github.com/GMOD/generic-filehandle/blob/0e8209be25e3097307bd15e964edd8c017e808d7/src/remoteFile.ts#L100-L162
    __publicField(this, "read", async (buffer, offset = 0, length, position = 0, opts = {}) => {
      const { headers = {}, signal, overrides = {} } = opts;
      if (length < Infinity) {
        headers.range = `bytes=${position}-${position + length}`;
      } else if (length === Infinity && position !== 0) {
        headers.range = `bytes=${position}-`;
      }
      const args = {
        // @ts-expect-error private property
        ...this.baseOverrides,
        ...overrides,
        headers: {
          ...headers,
          ...overrides.headers,
          // @ts-expect-error private property
          ...this.baseOverrides.headers
        },
        method: "GET",
        redirect: "follow",
        mode: "cors",
        signal
      };
      const response = await this.fetch(this.url, args);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} ${this.url}`);
      }
      if (response.status === 200 || response.status === 206) {
        const responseData = await this.getBufferFromResponse(response);
        const bytesCopied = responseData.copy(buffer, offset, 0, Math.min(length, responseData.length));
        const res = response.headers.get("content-range");
        const sizeMatch = /\/(\d+)$/.exec(res || "");
        if (sizeMatch && sizeMatch[1]) {
          this._stat = { size: parseInt(sizeMatch[1], 10) };
        }
        return { bytesRead: bytesCopied, buffer };
      }
      throw new Error(`HTTP ${response.status} fetching ${this.url}`);
    });
  }
}
export {
  GenomicPositionHelper as G,
  RemoteFile as R,
  getRelativeGenomicPosition as a,
  getChromInterval as b,
  computeChromSizes as c,
  getChromTotalSize as d,
  filterUsingGenoPos as f,
  getAutoCompleteId as g,
  parseGenomicPosition as p,
  sanitizeChrName as s
};
//# sourceMappingURL=exported-utils-068d7b17.js.map
