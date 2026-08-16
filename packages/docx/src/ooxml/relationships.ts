import { NS } from './namespaces.js';
import { serializeXml, xmlElement } from './ordered-builder.js';

export interface RelationshipRecord {
  id: string;
  type: string;
  target: string;
  targetMode?: 'External';
}

export class RelationshipManager {
  private readonly relationships: RelationshipRecord[] = [];

  add(id: string, type: string, target: string, targetMode?: 'External'): void {
    this.relationships.push({ id, type, target, targetMode });
  }

  all(): readonly RelationshipRecord[] {
    return this.relationships;
  }

  toXml(): string {
    return serializeXml(
      xmlElement(
        'Relationships',
        { xmlns: NS.pkgRels },
        this.relationships.map((relationship) =>
          xmlElement('Relationship', {
            Id: relationship.id,
            Type: relationship.type,
            Target: relationship.target,
            ...(relationship.targetMode ? { TargetMode: relationship.targetMode } : {}),
          }),
        ),
      ),
    );
  }
}
