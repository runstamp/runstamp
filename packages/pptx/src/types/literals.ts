export const SCHEME_COLORS = [
  "dk1", "lt1", "dk2", "lt2",
  "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
  "hlink", "folHlink",
  "bg1", "tx1", "bg2", "tx2",
] as const;

export const PLACEHOLDER_TYPES = [
  "title", "body", "ctrTitle", "subTitle",
  "pic", "obj", "chart", "tbl", "dgm", "media", "clipArt",
  "dt", "ftr", "hdr", "sldNum", "sldImg",
] as const;

export const BASIC_SHAPES = [
  "rect", "ellipse", "roundRect", "triangle", "rtTriangle", "rightTriangle",
  "diamond", "parallelogram", "trapezoid", "nonIsoscelesTrapezoid", "heart",
  "plus", "cross", "chevron", "homePlate", "donut", "cloud", "hexagon",
  "pentagon", "octagon", "decagon", "heptagon", "dodecagon",
  "snip1Rect", "snip2SameRect", "snip2DiagRect", "snip2SameRect2",
  "snipRoundRect", "snipRound2SameRect",
  "round1Rect", "round2SameRect", "round2DiagRect", "round1Rect2",
  "bevel", "noSmoking", "blockArc", "pie", "pieWedge",
  "arc", "chord", "corner", "diagStripe", "halfFrame",
  "frame", "foldedCorner", "can", "cube", "teardrop",
  "gear6", "gear9", "plaque", "smileyFace",
  "irregularSeal1", "irregularSeal2",
  "ribbon", "ribbon2", "leftRightRibbon",
  "lightningBolt", "moon", "sun", "funnel",
  "wave", "doubleWave", "ellipseRibbon", "ellipseRibbon2",
  "verticalScroll", "horizontalScroll",
  "line", "lineInv", "heptagram", "decaStar",
] as const;

export const ARROW_SHAPES = [
  "rightArrow", "leftArrow", "upArrow", "downArrow",
  "leftRightArrow", "upDownArrow", "bentArrow", "uturnArrow", "bentUpArrow",
  "curvedRightArrow", "curvedLeftArrow", "curvedUpArrow", "curvedDownArrow",
  "stripedRightArrow", "notchedRightArrow",
  "circularArrow", "leftCircularArrow", "swooshArrow",
  "leftRightUpArrow", "quadArrow", "leftUpArrow",
] as const;

export const ARROW_CALLOUT_SHAPES = [
  "quadArrowCallout", "leftRightArrowCallout", "upDownArrowCallout",
  "leftArrowCallout", "rightArrowCallout", "upArrowCallout", "downArrowCallout",
] as const;

export const FLOWCHART_SHAPES = [
  "flowChartProcess", "flowChartDecision", "flowChartDocument",
  "flowChartTerminator", "flowChartConnector", "flowChartMerge",
  "flowChartSort", "flowChartExtract", "flowChartPreparation",
  "flowChartManualInput", "flowChartManualOperation",
  "flowChartPredefinedProcess", "flowChartInternalStorage",
  "flowChartMultidocument", "flowChartOffpageConnector",
  "flowChartPunchedTape", "flowChartSummingJunction", "flowChartOr",
  "flowChartDelay", "flowChartAlternateProcess",
  "flowChartMagneticDisk", "flowChartMagneticDrum",
  "flowChartMagneticTape", "flowChartDisplay",
  "flowChartOnlineStorage", "flowChartCollate",
  "flowChartInputOutput", "flowChartOfflineStorage",
] as const;

export const ACTION_BUTTON_SHAPES = [
  "actionButtonBlank", "actionButtonHome", "actionButtonHelp",
  "actionButtonInformation", "actionButtonBackPrevious",
  "actionButtonForwardNext", "actionButtonBeginning",
  "actionButtonEnd", "actionButtonReturn",
  "actionButtonSound", "actionButtonMovie",
] as const;

export const CALLOUT_SHAPES = [
  "wedgeRoundRectCallout", "wedgeRectCallout", "wedgeEllipseCallout",
  "wedgeRoundRectCallout2", "cloudCallout",
  "borderCallout1", "borderCallout2", "borderCallout3",
  "callout1", "callout2", "callout3",
  "accentCallout1", "accentCallout2", "accentCallout3",
  "accentBorderCallout1", "accentBorderCallout2", "accentBorderCallout3",
] as const;

export const MATH_SHAPES = [
  "mathPlus", "mathMinus", "mathMultiply", "mathDivide",
  "mathEqual", "mathNotEqual", "mathNotEqual2",
] as const;

export const STAR_SHAPES = [
  "star4", "star5", "star6", "star7", "star8",
  "star10", "star12", "star16", "star24", "star32",
] as const;

export const BRACKET_BRACE_SHAPES = [
  "leftBrace", "rightBrace", "leftBracket", "rightBracket",
  "bracePair", "bracketPair",
] as const;

export const TAB_SHAPES = ["plaqueTabs", "squareTabs", "roundTab"] as const;

export const CONNECTOR_SHAPES = [
  "curvedConnector2", "curvedConnector3", "curvedConnector4", "curvedConnector5",
  "straightConnector1", "bentConnector2", "bentConnector3", "bentConnector4", "bentConnector5",
] as const;

export const SHAPE_TYPES = [
  ...BASIC_SHAPES,
  ...ARROW_SHAPES,
  ...ARROW_CALLOUT_SHAPES,
  ...FLOWCHART_SHAPES,
  ...ACTION_BUTTON_SHAPES,
  ...CALLOUT_SHAPES,
  ...MATH_SHAPES,
  ...STAR_SHAPES,
  ...BRACKET_BRACE_SHAPES,
  ...TAB_SHAPES,
  ...CONNECTOR_SHAPES,
] as const;

export const PATTERN_TYPES = [
  "ltDnDiag", "ltUpDiag", "dkDnDiag", "dkUpDiag",
  "ltHorz", "ltVert", "dkHorz", "dkVert",
  "cross", "dnDiag", "upDiag", "diagCross",
  "smCheck", "lgCheck", "pct25", "pct50",
] as const;

export const CHART_TYPES = [
  "bar", "line", "pie", "scatter", "bubble", "area", "doughnut", "radar",
  "waterfall", "stock", "funnel", "treemap", "sunburst", "histogram", "boxWhisker",
] as const;

export const CONNECTOR_TYPES = ["straight", "elbow", "curved"] as const;

export const ARROW_HEAD_TYPES = [
  "none", "triangle", "stealth", "diamond", "oval", "arrow",
] as const;

export const ARROW_HEAD_SIZES = ["sm", "med", "lg"] as const;
