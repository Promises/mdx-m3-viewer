/**
 * An INI property.
 */
export type IniProperty = string | number;

/**
 * An INI section.
 */
export type IniSection = Map<string, IniProperty>;

/**
 * An INI file.
 */
export class IniFile {
  properties: Map<string, IniProperty> = new Map();
  sections: Map<string, IniSection> = new Map();

  load(buffer: string) {
    // All properties added until a section is reached are added to the properties map.
    // Once a section is reached, any further properties will be added to it until matching another section, etc.
    let section: IniSection | null = this.properties;
    let sections = this.sections;

    for (let line of buffer.split('\r\n')) {
      // INI defines comments as starting with a semicolon ';'.
      // However, Warcraft 3 INI files use normal C comments '//'.
      // In addition, Warcraft 3 files have empty lines.
      // Therefore, ignore any line matching any of these conditions.
      if (line.length && !line.startsWith('//') && !line.startsWith(';')) {
        let match = line.match(/^\[(.+?)\]/);

        if (match) {
          let name = match[1].trim().toLowerCase();

          section = <IniSection | null>sections.get(name);

          if (!section) {
            section = new Map();

            sections.set(name, section);
          }
        } else {
          match = line.match(/^(.+?)=(.*?)$/);

          if (match) {
            let value: IniProperty = match[2];
            let valueAsNumber = parseFloat(value);

            // Store numbers as numbers.
            if (!isNaN(valueAsNumber)) {
              value = valueAsNumber;
            }

            section.set(match[1], value);
          }
        }
      }
    }
  }

  save() {
    let lines = [];

    for (let [key, value] of this.properties) {
      lines.push(`${key}=${value}`);
    }

    for (let [name, section] of this.sections) {
      lines.push(`[${name}]`);

      for (let [key, value] of section) {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\r\n');
  }

  getSection(name: string) {
    return this.sections.get(name.toLowerCase());
  }
}
