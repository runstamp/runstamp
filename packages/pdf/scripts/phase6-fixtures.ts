import type { PdfDocumentPhase6 } from "../src/engine.js";

function repeatedParagraph(seed: string, repeats: number): string {
  return Array.from({ length: repeats }, (_, index) => `${seed} section ${index + 1} explains how interactive PDFs behave in real document workflows.`).join(" ");
}

export function createExternalLinkDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        level: 1,
        type: "heading",
        value: "External Links",
      },
      {
        link: { kind: "external", url: "https://runstamp.com/docs" },
        style: { marginTop: 16 },
        type: "paragraph",
        value: "Open the Runstamp documentation.",
      },
    ],
    meta: {
      title: "External Links",
    },
  };
}

export function createNavigationDocument(): PdfDocumentPhase6 {
  return {
    bookmarks: {
      fromHeadings: true,
    },
    children: [
      {
        maxLevel: 3,
        style: { marginBottom: 24 },
        title: "Contents",
        type: "toc",
      },
      {
        id: "introduction",
        level: 1,
        type: "heading",
        value: "Introduction",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Introduction", 34),
      },
      {
        id: "installation",
        level: 1,
        type: "heading",
        value: "Installation",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Installation", 28),
      },
      {
        id: "configuration",
        level: 2,
        type: "heading",
        value: "Configuration",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Configuration", 24),
      },
      {
        id: "deployment",
        level: 1,
        type: "heading",
        value: "Deployment",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Deployment", 26),
      },
    ],
    meta: {
      author: "Runstamp",
      creationDate: "2026-03-29T00:00:00.000Z",
      creator: "json-to-pdf benchmark",
      keywords: ["phase6", "navigation"],
      modDate: "2026-03-29T00:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      subject: "Interactive PDF navigation",
      title: "Phase 6 Navigation",
    },
    pageLabels: [
      { prefix: "FR-", startPage: 0, style: "roman-lower" },
      { startPage: 1, style: "arabic" },
    ],
  };
}

export function createTextFieldDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        type: "heading",
        value: "Contact Form",
      },
      {
        height: 28,
        label: "Full name",
        fontColor: "#1F2937",
        name: "full_name",
        maxLength: 64,
        readOnly: true,
        required: true,
        style: { marginTop: 16, width: 240 },
        type: "form-text",
        tooltip: "Enter the attendee's legal name",
        value: "Ada Lovelace",
        multiline: true,
      },
    ],
    meta: {
      title: "Text Field Form",
    },
  };
}

export function createCheckboxDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        type: "heading",
        value: "Checkbox Form",
      },
      {
        checked: false,
        fontColor: "#0F766E",
        label: "Accept the terms",
        name: "accept_terms",
        size: 16,
        readOnly: true,
        required: true,
        style: { marginTop: 16 },
        type: "form-checkbox",
        tooltip: "Required before submission",
      },
    ],
    meta: {
      title: "Checkbox Form",
    },
  };
}

export function createDropdownDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        type: "heading",
        value: "Dropdown Form",
      },
      {
        fontColor: "#4338CA",
        label: "Team",
        name: "team",
        readOnly: true,
        required: true,
        options: ["Design", "Engineering", "Operations"],
        style: { marginTop: 16, width: 220 },
        type: "form-dropdown",
        tooltip: "Choose the delivery team",
        value: "Engineering",
      },
    ],
    meta: {
      title: "Dropdown Form",
    },
  };
}

export function createRadioDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        type: "heading",
        value: "Radio Form",
      },
      {
        fontColor: "#991B1B",
        group: "delivery",
        label: "Monthly",
        name: "delivery-monthly",
        required: true,
        size: 16,
        style: { marginTop: 16 },
        type: "form-radio",
        tooltip: "Billed once per month",
        value: "Monthly",
      },
      {
        checked: true,
        fontColor: "#991B1B",
        group: "delivery",
        label: "Annual",
        name: "delivery-annual",
        readOnly: true,
        required: true,
        size: 16,
        style: { marginTop: 12 },
        type: "form-radio",
        tooltip: "Billed once per year",
        value: "Annual",
      },
    ],
    meta: {
      title: "Radio Form",
    },
  };
}

export function createMixedFormDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        children: [
          {
            label: "First name",
            name: "first_name",
            style: { width: 220 },
            type: "form-text",
            value: "Grace",
          },
          {
            checked: true,
            group: "subscription",
            name: "subscription-monthly",
            size: 14,
            style: { marginTop: 12 },
            type: "form-radio",
            value: "Monthly",
          },
          {
            checked: false,
            name: "accept_terms",
            size: 16,
            style: { marginTop: 12 },
            type: "form-checkbox",
          },
          {
            group: "subscription",
            name: "subscription-annual",
            size: 14,
            style: { marginTop: 12 },
            type: "form-radio",
            value: "Annual",
          },
          {
            name: "team",
            options: ["Design", "Engineering"],
            style: { marginTop: 12, width: 180 },
            type: "form-dropdown",
            value: "Engineering",
          },
        ],
        style: { width: 240 },
        type: "container",
      },
    ],
    meta: {
      title: "Mixed Forms",
    },
  };
}

export function createEditableFormDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        level: 1,
        type: "heading",
        value: "Editable Form Verification",
      },
      {
        type: "paragraph",
        value: "Use this fixture to verify Acrobat interaction with editable text, checkbox, radio, and dropdown widgets.",
      },
      {
        children: [
          {
            height: 28,
            label: "Project name",
            maxLength: 48,
            name: "project_name",
            required: true,
            style: { marginTop: 16, width: 240 },
            tooltip: "Editable multiline text field",
            type: "form-text",
            value: "Runstamp rollout",
          },
          {
            checked: false,
            label: "Approve release",
            name: "approve_release",
            size: 16,
            style: { marginTop: 12 },
            tooltip: "Editable checkbox",
            type: "form-checkbox",
          },
          {
            checked: true,
            group: "billing_cycle",
            label: "Monthly",
            name: "billing-monthly",
            size: 16,
            style: { marginTop: 12 },
            tooltip: "Editable radio option",
            type: "form-radio",
            value: "Monthly",
          },
          {
            group: "billing_cycle",
            label: "Annual",
            name: "billing-annual",
            size: 16,
            style: { marginTop: 12 },
            tooltip: "Editable radio option",
            type: "form-radio",
            value: "Annual",
          },
          {
            label: "Team",
            name: "team",
            options: ["Design", "Engineering", "Operations"],
            style: { marginTop: 12, width: 220 },
            tooltip: "Editable dropdown",
            type: "form-dropdown",
            value: "Engineering",
          },
        ],
        style: { width: 260 },
        type: "container",
      },
    ],
    meta: {
      title: "Editable Form Verification",
    },
  };
}

export function createPageNumberDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        level: 1,
        type: "heading",
        value: "Paged Report",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Paged Report", 120),
      },
      {
        level: 1,
        type: "heading",
        value: "Appendix",
      },
      {
        type: "paragraph",
        value: repeatedParagraph("Appendix", 110),
      },
    ],
    meta: {
      title: "Page Number Report",
    },
    pageNumber: {
      fontSize: 11,
      format: "Page {page} of {total}",
      x: 72,
      y: 28,
    },
  };
}

export function createMetadataDocument(): PdfDocumentPhase6 {
  return {
    children: [
      {
        type: "heading",
        value: "Metadata Document",
      },
      {
        type: "paragraph",
        value: "This document exists to verify Phase 6 metadata and XMP synchronization.",
      },
    ],
    meta: {
      author: "Runstamp",
      creationDate: "2026-03-29T09:15:00.000Z",
      creator: "Phase 6 benchmark",
      keywords: ["metadata", "xmp"],
      modDate: "2026-03-29T11:30:00.000Z",
      producer: "Runstamp json-to-pdf",
      subject: "Metadata verification",
      title: "Phase 6 Metadata",
    },
  };
}

export function createInteractiveTableDocument(): PdfDocumentPhase6 {
  return {
    bookmarks: {
      fromHeadings: true,
    },
    children: [
      {
        maxLevel: 2,
        style: { marginBottom: 16 },
        title: "Contents",
        type: "toc",
      },
      {
        id: "summary",
        level: 1,
        type: "heading",
        value: "Summary",
      },
      {
        type: "paragraph",
        value: "This document combines interactive navigation with Phase 5 table pagination.",
      },
      {
        id: "pipeline-table",
        level: 2,
        type: "heading",
        value: "Pipeline Table",
      },
      {
        body: Array.from({ length: 40 }, (_, index) => ({
          cells: [
            { children: [{ type: "paragraph", value: `#${index + 1}` }] },
            { children: [{ type: "paragraph", value: `Account ${index + 1}` }] },
            { children: [{ type: "paragraph", value: index % 2 === 0 ? "Qualified" : "Proposal" }] },
          ],
        })),
        columns: [{ width: 64 }, {}, { width: 120 }],
        header: [
          {
            cells: [
              { children: [{ type: "paragraph", value: "ID" }], role: "th" },
              { children: [{ type: "paragraph", value: "Account" }], role: "th" },
              { children: [{ type: "paragraph", value: "Stage" }], role: "th" },
            ],
          },
        ],
        style: { marginTop: 12, width: "100%" },
        type: "table",
      },
    ],
    meta: {
      author: "Runstamp",
      title: "Interactive Table Document",
    },
    pageNumber: {
      format: "Page {page} of {total}",
      x: 72,
      y: 28,
    },
  };
}
