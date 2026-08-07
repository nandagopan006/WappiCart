/**
 * Generates the placeholder shoe art in /public/shoes.
 *
 * These are stand-ins. Replace each file with a real photograph before the
 * shop goes live — see README.md → "Product images".
 *
 * Why a script rather than twelve hand-drawn files: every silhouette is emitted
 * through the same transform, so all twelve share one scale and one contact
 * point. That shared baseline is what lets the shelf line run unbroken across a
 * row, and it is the same discipline a real photo shoot needs.
 *
 *   node scripts/generate-placeholder-shoes.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "shoes");

/* Canvas. Wider than tall, because a strict side profile is roughly 2.6:1 —
   a square frame would leave the shoe stranded in empty space. */
const WIDTH = 1400;
const HEIGHT = 640;

/* One transform for every shoe: same scale, same contact point. The paths below
   are drawn in a shared working space where the ground sits at y=1158.
   The translate lands that ground on y=HEIGHT exactly — the sole touches the
   bottom edge of every file, so the shelf line drawn under the image is the
   surface the shoe rests on rather than a rule floating below it. */
const TRANSFORM = "translate(-234 -911.72) scale(1.34)";

/* Palette values from app/globals.css. These are image assets, not components —
   the real photographs that replace them will carry their own colour. */
const INK = "#14110f";
const SHELF = "#dcd9d2";

/**
 * Keyed by product slug, so the art and the data cannot drift apart.
 *
 * Every upper is drawn as the same four moves, left to right: a rounded toe
 * box, a vamp that runs almost level, a throat, and a heel counter that is the
 * tallest point. Categories differ in how high the collar carries and how thick
 * the sole is — the same discipline a real shoot would hold to.
 */
const silhouettes = {
  "runner-low-white": {
    /* Low collar, lace notch over the throat, thick cup sole. */
    upper:
      "M212 1086 C194 1042 204 1000 250 984 C336 954 438 940 524 934 C602 930 654 912 690 884 L728 824 C746 806 772 806 788 826 C812 856 838 878 872 890 C912 902 946 894 978 872 C1024 842 1074 834 1114 846 C1154 862 1178 918 1186 1000 C1190 1036 1190 1064 1188 1086 Z",
    sole: "M196 1158 C184 1114 192 1092 212 1086 L1186 1086 C1196 1112 1194 1140 1192 1158 Z",
  },
  "court-canvas-off": {
    /* Flatter topline than the runner, on a thicker vulcanised sole. */
    upper:
      "M210 1074 C194 1034 204 998 248 984 C338 956 442 944 530 940 C606 936 656 922 692 898 L726 850 C744 834 768 834 784 852 C808 878 834 896 866 906 C904 914 938 906 968 886 C1012 858 1060 852 1098 864 C1136 880 1158 930 1166 1004 C1170 1038 1170 1058 1168 1074 Z",
    sole: "M192 1158 C178 1110 188 1082 210 1074 L1170 1074 C1182 1104 1180 1136 1178 1158 Z",
  },
  "trail-mid-olive": {
    /* Mid cut: the collar carries well above the ankle, over a lugged sole. */
    upper:
      "M206 1066 C190 1022 200 982 246 966 C334 936 436 922 522 916 C598 912 650 894 686 866 L716 792 C734 774 760 774 776 794 C798 824 822 846 854 858 C886 868 916 862 944 844 C978 782 1024 750 1074 754 C1128 760 1160 812 1172 902 C1180 964 1182 1038 1180 1066 Z",
    sole: "M188 1158 C174 1104 186 1074 206 1066 L1182 1066 C1194 1100 1192 1136 1190 1158 Z",
  },
  "canvas-slip-navy": {
    /* No lace notch — the topline runs from toe to heel in one line. */
    upper:
      "M212 1080 C196 1038 206 998 252 982 C340 952 442 940 528 934 C606 930 660 912 700 886 C744 858 800 848 852 856 C912 866 962 880 1000 872 C1054 860 1112 872 1146 918 C1172 954 1184 1020 1184 1080 Z",
    sole: "M196 1158 C184 1112 192 1086 212 1080 L1184 1080 C1194 1108 1192 1138 1190 1158 Z",
  },
  "oxford-cap-toe-black": {
    /* Dress last: lower, longer, tapered, on a thin sole with a heel lift. */
    upper:
      "M216 1104 C200 1070 210 1038 254 1026 C350 996 458 982 546 976 C618 972 668 954 702 930 L732 892 C750 878 774 878 790 894 C812 918 838 934 868 942 C904 950 936 942 964 924 C1006 898 1054 894 1094 908 C1134 924 1160 972 1170 1036 C1175 1068 1176 1092 1174 1104 Z",
    sole: "M204 1158 C192 1128 198 1110 216 1104 L1020 1104 C1064 1102 1096 1090 1128 1084 C1154 1080 1174 1096 1178 1120 C1181 1136 1181 1150 1180 1158 Z",
  },
  "derby-plain-brown": {
    /* Open lacing, so the facing stands a little prouder than the oxford's. */
    upper:
      "M216 1102 C200 1068 210 1036 254 1024 C350 994 458 980 546 974 C614 970 662 952 696 926 L722 878 C740 862 766 862 782 880 C806 908 834 926 864 934 C900 942 932 934 960 916 C1002 890 1050 886 1090 900 C1130 916 1156 966 1166 1032 C1171 1066 1172 1090 1170 1102 Z",
    sole: "M204 1158 C192 1128 198 1110 216 1102 L1016 1102 C1060 1100 1092 1086 1124 1080 C1150 1076 1170 1092 1174 1118 C1177 1136 1177 1150 1176 1158 Z",
  },
  "brogue-wing-oxblood": {
    /* The same last as the derby on a taller stacked heel. */
    upper:
      "M218 1100 C202 1066 212 1034 256 1022 C352 992 460 978 548 972 C616 968 664 950 698 924 L724 880 C742 864 768 864 784 882 C808 910 836 928 866 936 C902 944 934 936 962 918 C1004 892 1052 888 1092 902 C1132 918 1158 968 1168 1034 C1173 1068 1174 1090 1172 1100 Z",
    sole: "M204 1158 C192 1130 198 1112 218 1100 L1010 1100 C1058 1098 1090 1078 1124 1070 C1154 1064 1176 1086 1180 1116 C1183 1136 1183 1150 1182 1158 Z",
  },
  "penny-loafer-tan": {
    /* No lacing: the vamp peaks, the throat dips, the heel counter rises. */
    upper:
      "M216 1102 C200 1068 210 1034 254 1022 C348 992 452 976 540 968 C606 962 654 942 688 914 C708 896 736 894 754 910 C770 926 776 950 768 972 L758 1000 C796 978 842 962 890 958 C960 952 1024 944 1064 928 C1104 914 1136 946 1152 1008 C1162 1046 1166 1084 1166 1102 Z",
    sole: "M206 1158 C194 1130 202 1112 218 1102 L1166 1102 C1176 1126 1174 1146 1172 1158 Z",
  },
  "tassel-loafer-black": {
    /* A lower topline and a slimmer sole than the penny. */
    upper:
      "M220 1104 C204 1072 214 1040 258 1028 C350 998 452 984 538 976 C602 970 648 952 680 926 C700 908 726 906 744 922 C760 938 766 960 758 982 L750 1006 C786 986 830 972 876 968 C944 962 1006 956 1044 942 C1082 930 1112 960 1128 1018 C1138 1054 1142 1088 1142 1104 Z",
    sole: "M210 1158 C200 1132 206 1116 222 1104 L1142 1104 C1152 1126 1150 1146 1148 1158 Z",
  },
  "driver-moc-grey": {
    /* Soft and unlined, so the whole upper sits lower than anything else here. */
    upper:
      "M226 1104 C210 1076 220 1048 262 1036 C352 1008 450 994 532 986 C592 980 636 964 666 940 C686 924 710 922 726 936 C742 950 748 970 740 990 L732 1012 C766 994 806 982 850 978 C912 972 966 966 1000 954 C1034 942 1060 970 1074 1022 C1082 1054 1086 1090 1086 1104 Z",
    sole: "M216 1158 C204 1130 212 1112 228 1104 L1086 1104 C1098 1126 1096 1146 1094 1158 Z",
  },
  "kolhapuri-slide-natural": {
    /* A slide is mostly sole: a toe loop and a V strap, nothing behind. */
    upper: [
      "M296 1110 C296 1074 314 1044 348 1040 L392 1040 C412 1044 424 1072 424 1110 L392 1110 C392 1086 384 1074 370 1072 L354 1072 C338 1074 328 1086 328 1110 Z",
      "M556 1110 C556 1064 592 1000 646 992 L836 992 C888 998 924 1064 924 1110 L888 1110 C888 1076 862 1032 828 1026 L654 1026 C620 1032 592 1076 592 1110 Z",
    ].join(" "),
    sole: "M212 1158 C200 1134 208 1116 226 1110 L1178 1110 C1190 1132 1188 1148 1186 1158 Z",
  },
  "strap-sandal-black": {
    /* An instep strap, and an ankle strap standing above a moulded footbed. */
    upper: [
      "M440 1096 C440 1040 480 972 546 964 L764 964 C824 972 862 1040 862 1096 L826 1096 C826 1058 800 1006 758 998 L554 998 C512 1006 476 1058 476 1096 Z",
      "M950 1096 C950 1030 990 962 1050 954 L1096 954 C1146 964 1170 1030 1170 1096 L1136 1096 C1136 1052 1114 1000 1080 992 L1054 992 C1016 1000 986 1052 986 1096 Z",
    ].join(" "),
    sole: "M212 1158 C198 1128 208 1104 228 1096 L1180 1096 C1192 1120 1190 1142 1188 1158 Z",
  },
};

/** An SVG attribute cannot carry raw angle brackets, quotes or ampersands. */
function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Two further views, built from the same paths so a product never has one
   photo shot on Tuesday and another shot in a different light.

   PAIR   — both shoes on the shelf, the far one in --shelf so it recedes.
            Same baseline, because in a strict side profile a shoe further back
            does not float upward.
   DETAIL — the back half of the shoe filling the frame. Same 1400x640 canvas as
            the others, so swapping thumbnails never reflows the page. */
const PAIR_FRONT = "translate(-184 -656.96) scale(1.12)";
const PAIR_BACK = "translate(16 -656.96) scale(1.12)";
const DETAIL_TRANSFORM = "translate(-1166.4 -1611.2) scale(1.944)";

function shoe(upper, sole, transform, upperFill = INK) {
  return `  <g transform="${transform}" fill-rule="evenodd">
    <path d="${upper}" fill="${upperFill}" />
    <path d="${sole}" fill="${SHELF}" />
  </g>`;
}

function wrap(label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${escapeAttribute(label)}">
${body}
</svg>
`;
}

const views = {
  side: ({ label, upper, sole }) => wrap(label, shoe(upper, sole, TRANSFORM)),

  pair: ({ label, upper, sole }) =>
    wrap(
      `${label} — both shoes of the pair`,
      /* Far shoe first, so the near one paints over it. */
      [shoe(upper, sole, PAIR_BACK, SHELF), shoe(upper, sole, PAIR_FRONT)].join("\n"),
    ),

  detail: ({ label, upper, sole }) =>
    wrap(`${label} — close on the heel`, shoe(upper, sole, DETAIL_TRANSFORM)),
};

/* Drive the output from products.json, so adding a product tells you straight
   away that its art is missing. */
const products = JSON.parse(await readFile(join(ROOT, "data", "products.json"), "utf8"));

await mkdir(OUT_DIR, { recursive: true });

const missing = [];

for (const product of products) {
  const silhouette = silhouettes[product.slug];
  if (!silhouette) {
    missing.push(product.slug);
    continue;
  }

  const label = product.alt ?? `${product.name}, side profile`;

  /* images[0] keeps the product's own slug as its filename, because it is the
     one the grid, the hero and every OG card point at. */
  for (const [name, render] of Object.entries(views)) {
    const file = name === "side" ? `${product.slug}.svg` : `${product.slug}-${name}.svg`;
    await writeFile(join(OUT_DIR, file), render({ ...silhouette, label }), "utf8");
    console.log(`wrote public/shoes/${file}`);
  }
}

if (missing.length) {
  console.error(`\nNo silhouette defined for: ${missing.join(", ")}`);
  console.error("Add one to this script, or drop a real photograph in public/shoes.");
  process.exitCode = 1;
} else {
  console.log(`\n${products.length} placeholders written. Swap them for real photographs.`);
}
