// src/common/pipes/sanitize.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml = require('sanitize-html');

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [],        // strip ALL html tags
        allowedAttributes: {},  // strip ALL attributes
      });
    }

    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        value[key] = this.sanitize(value[key]);  // recursively sanitize nested objects
      }
    }

    return value;
  }
}