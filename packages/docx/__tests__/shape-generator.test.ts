/**
 * Shape Generator Tests
 * =====================
 * Tests for the shape SVG and VML generation utilities.
 */

import {
  generateShapeSVG,
  generateShapeVML,
  shapeToSVGDataUri,
  registerShapeImageRenderer,
  clearShapeImageRenderer,
  renderShapeToImage,
  hasShapeImageRenderer,
  canRenderShapeNatively,
  shouldRenderShapeAsImage,
  getRecommendedRenderingApproach,
  type ShapeImageRenderer,
} from '../src/elements/shapes/shape-generator';
import type { ShapeElement, ShapeType, ComputedStyle, BoundingBox } from '../src/types';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createDefaultStyle(): ComputedStyle {
  return {
    backgroundColor: undefined,
    backgroundImage: undefined,
    borderTopWidth: 0,
    borderTopColor: '',
    borderTopStyle: 'none',
    borderRightWidth: 0,
    borderRightColor: '',
    borderRightStyle: 'none',
    borderBottomWidth: 0,
    borderBottomColor: '',
    borderBottomStyle: 'none',
    borderLeftWidth: 0,
    borderLeftColor: '',
    borderLeftStyle: 'none',
    borderRadius: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'left',
    textDecoration: 'none',
    color: '#000000',
    display: 'block',
    visibility: 'visible',
    overflow: 'visible',
    opacity: 1,
  };
}

function createBoundingBox(x = 0, y = 0, width = 100, height = 80): BoundingBox {
  return { x, y, width, height };
}

function createShapeElement(
  shapeType: ShapeType,
  options: Partial<ShapeElement> = {}
): ShapeElement {
  return {
    id: options.id ?? 'shape-1',
    type: 'shape',
    shapeType,
    fill: options.fill,
    stroke: options.stroke,
    text: options.text,
    runs: options.runs,
    pathData: options.pathData,
    style: { ...createDefaultStyle(), ...options.style },
    position: options.position ?? createBoundingBox(),
    zIndex: 0,
    opacity: 1,
    tagName: 'div',
    dataAttributes: {},
  };
}

// =============================================================================
// SVG GENERATION TESTS
// =============================================================================

describe('SVG Shape Generation', () => {
  describe('Rectangle', () => {
    it('should generate valid SVG for rectangle', () => {
      const shape = createShapeElement('rectangle', {
        position: createBoundingBox(0, 0, 100, 50),
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<rect');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="50"');
    });

    it('should apply fill color', () => {
      const shape = createShapeElement('rectangle', {
        fill: { type: 'solid', color: '#FF0000' },
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('fill="#FF0000"');
    });

    it('should apply stroke', () => {
      const shape = createShapeElement('rectangle', {
        stroke: { color: '#0000FF', width: 2, style: 'solid' },
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('stroke="#0000FF"');
      expect(svg).toContain('stroke-width="2"');
    });

    it('should apply border radius', () => {
      const shape = createShapeElement('rectangle', {
        style: { ...createDefaultStyle(), borderRadius: 10 },
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('rx="10"');
    });
  });

  describe('Ellipse', () => {
    it('should generate valid SVG for ellipse', () => {
      const shape = createShapeElement('ellipse', {
        position: createBoundingBox(0, 0, 100, 60),
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<ellipse');
      expect(svg).toContain('rx="50"'); // width / 2
      expect(svg).toContain('ry="30"'); // height / 2
    });
  });

  describe('Triangle', () => {
    it('should generate valid SVG for triangle', () => {
      const shape = createShapeElement('triangle');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
      expect(svg).toContain('points=');
    });
  });

  describe('Diamond', () => {
    it('should generate valid SVG for diamond', () => {
      const shape = createShapeElement('diamond');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
    });
  });

  describe('Pentagon', () => {
    it('should generate valid SVG for pentagon', () => {
      const shape = createShapeElement('pentagon');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
      // Pentagon has 5 points
      const pointsMatch = svg.match(/points="([^"]+)"/);
      expect(pointsMatch).toBeTruthy();
      const points = pointsMatch![1].split(' ');
      expect(points.length).toBe(5);
    });
  });

  describe('Hexagon', () => {
    it('should generate valid SVG for hexagon', () => {
      const shape = createShapeElement('hexagon');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
      const pointsMatch = svg.match(/points="([^"]+)"/);
      expect(pointsMatch).toBeTruthy();
      const points = pointsMatch![1].split(' ');
      expect(points.length).toBe(6);
    });
  });

  describe('Star', () => {
    it('should generate valid SVG for star', () => {
      const shape = createShapeElement('star');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
      // Star has 10 points (5 outer + 5 inner)
      const pointsMatch = svg.match(/points="([^"]+)"/);
      expect(pointsMatch).toBeTruthy();
      const points = pointsMatch![1].split(' ');
      expect(points.length).toBe(10);
    });
  });

  describe('Arrow', () => {
    it('should generate valid SVG for arrow', () => {
      const shape = createShapeElement('arrow');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<polygon');
    });
  });

  describe('Line', () => {
    it('should generate valid SVG for line', () => {
      const shape = createShapeElement('line', {
        position: createBoundingBox(0, 0, 200, 10),
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<line');
      expect(svg).toContain('x1=');
      expect(svg).toContain('x2=');
    });
  });

  describe('Custom', () => {
    it('should use path data for custom shapes', () => {
      const shape = createShapeElement('custom', {
        pathData: 'M 0 0 L 100 0 L 100 100 Z',
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<path');
      expect(svg).toContain('M 0 0 L 100 0 L 100 100 Z');
    });

    it('should fallback to rectangle for custom without path', () => {
      const shape = createShapeElement('custom');

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<rect');
    });
  });

  describe('Text Content', () => {
    it('should include text in SVG', () => {
      const shape = createShapeElement('rectangle', {
        text: 'Hello World',
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('<text');
      expect(svg).toContain('Hello World');
    });

    it('should escape XML special characters in text', () => {
      const shape = createShapeElement('rectangle', {
        text: 'A < B & C > D',
      });

      const svg = generateShapeSVG(shape);

      expect(svg).toContain('&lt;');
      expect(svg).toContain('&gt;');
      expect(svg).toContain('&amp;');
    });
  });

  describe('Options', () => {
    it('should respect custom padding', () => {
      const shape = createShapeElement('rectangle', {
        position: createBoundingBox(0, 0, 100, 50),
      });

      const svg = generateShapeSVG(shape, { padding: 10 });

      expect(svg).toContain('width="120"'); // 100 + 10*2
      expect(svg).toContain('height="70"'); // 50 + 10*2
    });

    it('should use default colors when not specified', () => {
      const shape = createShapeElement('rectangle');

      const svg = generateShapeSVG(shape, {
        defaultFill: '#EEEEEE',
        defaultStroke: '#333333',
      });

      expect(svg).toContain('fill="#EEEEEE"');
      expect(svg).toContain('stroke="#333333"');
    });
  });
});

// =============================================================================
// VML GENERATION TESTS
// =============================================================================

describe('VML Shape Generation', () => {
  it('should generate VML for rectangle', () => {
    const shape = createShapeElement('rectangle', {
      position: createBoundingBox(0, 0, 100, 50),
    });

    const vml = generateShapeVML(shape);

    expect(vml).toContain('<v:rect');
    expect(vml).toContain('width:100pt');
    expect(vml).toContain('height:50pt');
  });

  it('should generate VML for ellipse', () => {
    const shape = createShapeElement('ellipse');

    const vml = generateShapeVML(shape);

    expect(vml).toContain('<v:oval');
  });

  it('should generate VML for line', () => {
    const shape = createShapeElement('line');

    const vml = generateShapeVML(shape);

    expect(vml).toContain('<v:line');
  });

  it('should include wrapper by default', () => {
    const shape = createShapeElement('rectangle');

    const vml = generateShapeVML(shape);

    expect(vml).toContain('<w:pict');
    expect(vml).toContain('xmlns:v=');
  });

  it('should exclude wrapper when disabled', () => {
    const shape = createShapeElement('rectangle');

    const vml = generateShapeVML(shape, { includeWrapper: false });

    expect(vml).not.toContain('<w:pict');
    expect(vml).toContain('<v:rect');
  });

  it('should apply fill and stroke', () => {
    const shape = createShapeElement('rectangle', {
      fill: { type: 'solid', color: '#FF0000' },
      stroke: { color: '#0000FF', width: 2, style: 'solid' },
    });

    const vml = generateShapeVML(shape);

    expect(vml).toContain('color="#FF0000"');
    expect(vml).toContain('color="#0000FF"');
    expect(vml).toContain('weight="2pt"');
  });
});

// =============================================================================
// DATA URI TESTS
// =============================================================================

describe('Shape to Data URI', () => {
  it('should generate valid SVG data URI', () => {
    const shape = createShapeElement('rectangle');

    const dataUri = shapeToSVGDataUri(shape);

    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should decode to valid SVG', () => {
    const shape = createShapeElement('ellipse');

    const dataUri = shapeToSVGDataUri(shape);
    const base64 = dataUri.replace('data:image/svg+xml;base64,', '');
    const svg = Buffer.from(base64, 'base64').toString('utf-8');

    expect(svg).toContain('<svg');
    expect(svg).toContain('<ellipse');
  });
});

// =============================================================================
// SHAPE RENDERER REGISTRY TESTS
// =============================================================================

describe('Shape Image Renderer Registry', () => {
  beforeEach(() => {
    clearShapeImageRenderer();
  });

  afterEach(() => {
    clearShapeImageRenderer();
  });

  it('should register a renderer', () => {
    const renderer: ShapeImageRenderer = async () => ({
      data: Buffer.from('test'),
      width: 100,
      height: 100,
      format: 'png',
    });

    registerShapeImageRenderer(renderer);

    expect(hasShapeImageRenderer()).toBe(true);
  });

  it('should clear the renderer', () => {
    registerShapeImageRenderer(async () => ({
      data: '',
      width: 0,
      height: 0,
      format: 'png',
    }));

    clearShapeImageRenderer();

    expect(hasShapeImageRenderer()).toBe(false);
  });

  it('should render shape using registered renderer', async () => {
    const expectedData = Buffer.from('rendered-shape');
    registerShapeImageRenderer(async (element) => ({
      data: expectedData,
      width: element.position.width,
      height: element.position.height,
      format: 'png',
    }));

    const shape = createShapeElement('star', {
      position: createBoundingBox(0, 0, 200, 150),
    });

    const result = await renderShapeToImage(shape);

    expect(result).not.toBeNull();
    expect(result!.data).toBe(expectedData);
    expect(result!.width).toBe(200);
    expect(result!.height).toBe(150);
  });

  it('should return null when no renderer registered', async () => {
    const shape = createShapeElement('star');

    const result = await renderShapeToImage(shape);

    expect(result).toBeNull();
  });
});

// =============================================================================
// CAPABILITY CHECK TESTS
// =============================================================================

describe('Shape Capability Checks', () => {
  describe('canRenderShapeNatively', () => {
    it('should return true for rectangle', () => {
      expect(canRenderShapeNatively('rectangle')).toBe(true);
    });

    it('should return true for line', () => {
      expect(canRenderShapeNatively('line')).toBe(true);
    });

    it('should return false for ellipse', () => {
      expect(canRenderShapeNatively('ellipse')).toBe(false);
    });

    it('should return false for star', () => {
      expect(canRenderShapeNatively('star')).toBe(false);
    });
  });

  describe('shouldRenderShapeAsImage', () => {
    it('should return true for ellipse', () => {
      expect(shouldRenderShapeAsImage('ellipse')).toBe(true);
    });

    it('should return true for triangle', () => {
      expect(shouldRenderShapeAsImage('triangle')).toBe(true);
    });

    it('should return true for star', () => {
      expect(shouldRenderShapeAsImage('star')).toBe(true);
    });

    it('should return false for rectangle', () => {
      expect(shouldRenderShapeAsImage('rectangle')).toBe(false);
    });

    it('should return false for line', () => {
      expect(shouldRenderShapeAsImage('line')).toBe(false);
    });
  });

  describe('getRecommendedRenderingApproach', () => {
    beforeEach(() => {
      clearShapeImageRenderer();
    });

    it('should recommend text-box for shapes with text', () => {
      const shape = createShapeElement('star', { text: 'Hello' });

      expect(getRecommendedRenderingApproach(shape)).toBe('text-box');
    });

    it('should recommend paragraph for rectangle without text', () => {
      const shape = createShapeElement('rectangle');

      expect(getRecommendedRenderingApproach(shape)).toBe('paragraph');
    });

    it('should recommend paragraph for line', () => {
      const shape = createShapeElement('line');

      expect(getRecommendedRenderingApproach(shape)).toBe('paragraph');
    });

    it('should throw for complex shapes without renderer', () => {
      const shape = createShapeElement('star');

      expect(() => getRecommendedRenderingApproach(shape)).toThrow(
        /Cannot render shape "star": No image renderer registered/
      );
    });

    it('should recommend image for complex shapes with renderer', () => {
      registerShapeImageRenderer(async () => ({
        data: '',
        width: 0,
        height: 0,
        format: 'png',
      }));

      const shape = createShapeElement('star');

      expect(getRecommendedRenderingApproach(shape)).toBe('image');
    });
  });
});
