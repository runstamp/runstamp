import type { PaperDocument } from "../../src/types/ast.js";

// 1×1 red PNG (base64)
const RED_1x1_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

// 1×1 blue JPEG (base64)
const BLUE_1x1_JPG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgn/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCe4CqYO//Z";

export const imageVectors: Record<string, PaperDocument> = {
  "image-base64-png": {
    type: "Document",
    meta: { title: "Base64 PNG Image" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Image",
            style: { width: 200, height: 200 },
            src: RED_1x1_PNG,
          },
        ],
      },
    ],
  },

  "image-base64-jpg": {
    type: "Document",
    meta: { title: "Base64 JPEG Image" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Image",
            style: { width: 200, height: 200 },
            src: BLUE_1x1_JPG,
          },
        ],
      },
    ],
  },

  "image-multiple": {
    type: "Document",
    meta: { title: "Multiple Images" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Image",
            style: { width: 150, height: 150 },
            src: RED_1x1_PNG,
          },
          {
            type: "Image",
            style: { width: 150, height: 150 },
            src: BLUE_1x1_JPG,
          },
        ],
      },
    ],
  },
};
