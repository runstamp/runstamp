import { DOCXError, DOCXErrorCode, Errors } from '../errors.js';

export function createResourceLimitError(limit: string, actual: number, max: number): DOCXError {
  return new DOCXError(
    DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
    `Native OOXML resource limit exceeded for ${limit}: ${actual} > ${max}`,
    {
      recovery: 'Reduce document complexity or increase the native serializer resource limits.',
      context: { limit, actual, max },
    },
  );
}

export function createPackageIntegrityError(message: string, context?: Record<string, unknown>): DOCXError {
  return new DOCXError(
    DOCXErrorCode.SERIALIZATION_FAILED,
    `Native OOXML package integrity error: ${message}`,
    {
      recovery: 'Check the generated package parts and relationship targets.',
      context,
    },
  );
}

export function unsupportedElementType(elementType: string, location?: string): DOCXError {
  return Errors.elementNotImplemented(elementType, location);
}

export function impossibleElementType(elementType: string, location?: string): DOCXError {
  return Errors.unknownElement(elementType, location);
}

export function assertNeverElement(elementType: never, location?: string): never {
  throw impossibleElementType(String(elementType), location);
}
