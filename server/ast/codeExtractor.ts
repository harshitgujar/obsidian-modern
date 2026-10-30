import fs from 'fs';
import path from 'path';

export interface CodeSymbol {
  name: string;
  kind: 'class' | 'interface' | 'function' | 'type' | 'struct' | 'enum';
  line: number;
}

export interface CodeFileMeta {
  relPath: string;
  fileName: string;
  extension: string;
  symbols: CodeSymbol[];
  imports: string[]; // target module / relative paths
  linesCount: number;
}

export interface ArchitectureMapResult {
  filesAnalyzed: number;
  totalSymbols: number;
  totalDependencies: number;
  canvasPath: string;
  reportPath: string;
  godNodes: { path: string; connections: number }[];
}

export class CodeExtractor {
  private static CODE_EXTENSIONS = new Set([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    'py', 'rs', 'go', 'java', 'c', 'cpp', 'h'
  ]);

  /**
   * Scans a target folder and extracts structural AST relationships.
   */
  public static scanCodebase(baseDir: string): CodeFileMeta[] {
    const results: CodeFileMeta[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-electron' || entry.name === 'release') {
          continue;
        }

        const absPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, absPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          walk(absPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (this.CODE_EXTENSIONS.has(ext)) {
            try {
              const content = fs.readFileSync(absPath, 'utf8');
              const meta = this.parseFile(relPath, entry.name, ext, content);
              results.push(meta);
            } catch {}
          }
        }
      }
    };

    walk(baseDir);
    return results;
  }

  /**
   * Fast, reliable multi-language structural parser.
   */
  private static parseFile(relPath: string, fileName: string, ext: string, content: string): CodeFileMeta {
    const lines = content.split('\n');
    const symbols: CodeSymbol[] = [];
    const imports = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // TypeScript / JavaScript
      if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
        // Imports
        const importMatch = line.match(/(?:import|from|require)\s*\(?['"]([^'"]+)['"]\)?/);
        if (importMatch && !importMatch[1].startsWith('.' + '.' + '.') && importMatch[1].length > 1) {
          imports.add(importMatch[1]);
        }

        // Classes & Interfaces
        const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/);
        if (classMatch) symbols.push({ name: classMatch[1], kind: 'class', line: lineNum });

        const ifaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/);
        if (ifaceMatch) symbols.push({ name: ifaceMatch[1], kind: 'interface', line: lineNum });

        const typeMatch = line.match(/(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/);
        if (typeMatch) symbols.push({ name: typeMatch[1], kind: 'type', line: lineNum });

        // Functions
        const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
        if (fnMatch) symbols.push({ name: fnMatch[1], kind: 'function', line: lineNum });

        const constFnMatch = line.match(/(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/);
        if (constFnMatch) symbols.push({ name: constFnMatch[1], kind: 'function', line: lineNum });
      }

      // Python
      else if (ext === 'py') {
        const pyImportMatch = line.match(/^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/);
        if (pyImportMatch) {
          imports.add(pyImportMatch[1] || pyImportMatch[2]);
        }

        const pyClassMatch = line.match(/^class\s+([A-Za-z0-9_]+)/);
        if (pyClassMatch) symbols.push({ name: pyClassMatch[1], kind: 'class', line: lineNum });

        const pyDefMatch = line.match(/^def\s+([A-Za-z0-9_]+)/);
        if (pyDefMatch) symbols.push({ name: pyDefMatch[1], kind: 'function', line: lineNum });
      }

      // Rust
      else if (ext === 'rs') {
        const rsUseMatch = line.match(/^use\s+([^;]+);/);
        if (rsUseMatch) imports.add(rsUseMatch[1].trim());

        const rsStructMatch = line.match(/(?:pub\s+)?struct\s+([A-Za-z0-9_]+)/);
        if (rsStructMatch) symbols.push({ name: rsStructMatch[1], kind: 'struct', line: lineNum });

        const rsEnumMatch = line.match(/(?:pub\s+)?enum\s+([A-Za-z0-9_]+)/);
        if (rsEnumMatch) symbols.push({ name: rsEnumMatch[1], kind: 'enum', line: lineNum });

        const rsFnMatch = line.match(/(?:pub\s+)?fn\s+([A-Za-z0-9_]+)/);
        if (rsFnMatch) symbols.push({ name: rsFnMatch[1], kind: 'function', line: lineNum });
      }

      // Go
      else if (ext === 'go') {
        const goImportMatch = line.match(/^import\s+['"]([^'"]+)['"]/);
        if (goImportMatch) imports.add(goImportMatch[1]);

        const goTypeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)/);
        if (goTypeMatch) symbols.push({ name: goTypeMatch[1], kind: 'struct', line: lineNum });

        const goFnMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)/);
        if (goFnMatch) symbols.push({ name: goFnMatch[1], kind: 'function', line: lineNum });
      }
    }

    return {
      relPath,
      fileName,
      extension: ext,
      symbols,
      imports: Array.from(imports),
      linesCount: lines.length
    };
  }

  /**
   * Generates ARCHITECTURE.canvas and CODE_MAP.md inside the vault.
   */
  public static generateArtifacts(vaultDir: string, codeFiles: CodeFileMeta[]): ArchitectureMapResult {
    // 1. Calculate connection in/out degree to find "God Nodes" (Architectural hubs)
    const connectionCounts = new Map<string, number>();
    const fileMap = new Map<string, CodeFileMeta>();

    for (const file of codeFiles) {
      fileMap.set(file.relPath, file);
      connectionCounts.set(file.relPath, (connectionCounts.get(file.relPath) || 0) + file.imports.length);
    }

    // Resolve internal dependencies
    const edges: Array<{ from: string; to: string; label: string }> = [];

    for (const file of codeFiles) {
      for (const imp of file.imports) {
        // Resolve relative import
        let targetRel = imp;
        if (imp.startsWith('.')) {
          const dir = path.dirname(file.relPath);
          targetRel = path.normalize(path.join(dir, imp)).replace(/\\/g, '/');
        }

        // Check if matches any known file (with or without extension)
        const match = codeFiles.find(f => {
          const withoutExt = f.relPath.replace(/\.[^/.]+$/, '');
          return f.relPath === targetRel || withoutExt === targetRel || f.relPath.endsWith(`/${targetRel}`) || f.fileName.replace(/\.[^/.]+$/, '') === targetRel;
        });

        if (match && match.relPath !== file.relPath) {
          edges.push({
            from: file.relPath,
            to: match.relPath,
            label: 'imports'
          });
          connectionCounts.set(match.relPath, (connectionCounts.get(match.relPath) || 0) + 1);
        }
      }
    }

    // Identify God Nodes (top 5 by centrality)
    const godNodes = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([filePath, count]) => ({ path: filePath, connections: count }));

    // 2. Generate ARCHITECTURE.canvas
    const canvasNodes: any[] = [];
    const canvasEdges: any[] = [];

    const cols = Math.max(3, Math.ceil(Math.sqrt(codeFiles.length)));
    const cardWidth = 320;
    const cardHeight = 220;
    const gapX = 140;
    const gapY = 120;

    const fileToNodeId = new Map<string, string>();

    codeFiles.slice(0, 60).forEach((file, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const nodeId = `node-code-${idx + 1}`;
      fileToNodeId.set(file.relPath, nodeId);

      const symbolSummary = file.symbols.slice(0, 4).map(s => `• \`${s.kind}\` **${s.name}**`).join('\n') || `_${file.linesCount} lines_`;
      const isHub = godNodes.some(g => g.path === file.relPath);

      canvasNodes.push({
        id: nodeId,
        type: 'text',
        text: `### ${file.fileName}\n\`${file.relPath}\`\n\n${symbolSummary}\n\n**Imports**: ${file.imports.length} modules`,
        x: col * (cardWidth + gapX),
        y: row * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        color: isHub ? '1' : '4' // 1: Red/Coral (Hub), 4: Cyan/Blue (Module)
      });
    });

    // Add canvas edges
    edges.forEach((edge, idx) => {
      const fromNode = fileToNodeId.get(edge.from);
      const toNode = fileToNodeId.get(edge.to);
      if (fromNode && toNode) {
        canvasEdges.push({
          id: `edge-ast-${idx + 1}`,
          fromNode,
          toNode,
          label: 'imports',
          color: '4'
        });
      }
    });

    const canvasContent = JSON.stringify({ nodes: canvasNodes, edges: canvasEdges }, null, 2);
    const canvasPath = path.join(vaultDir, 'ARCHITECTURE.canvas');
    fs.writeFileSync(canvasPath, canvasContent, 'utf8');

    // 3. Generate CODE_MAP.md
    const totalSymbols = codeFiles.reduce((acc, f) => acc + f.symbols.length, 0);

    const reportLines: string[] = [
      '# Codebase Architecture & Dependency Map',
      '',
      `> Generated by Runagon CodeAST Engine on ${new Date().toLocaleDateString()}`,
      '',
      '## Overview Statistics',
      `- **Total Source Files Analyzed**: ${codeFiles.length}`,
      `- **Total Discovered Symbols**: ${totalSymbols} (classes, interfaces, functions)`,
      `- **Internal Dependencies**: ${edges.length} explicit extracted edges`,
      `- **Interactive Visual Canvas**: [[ARCHITECTURE.canvas]]`,
      '',
      '## Architectural Hubs ("God Nodes")',
      'The following modules have the highest degree of incoming and outgoing connections across the codebase:',
      ''
    ];

    godNodes.forEach((g, rank) => {
      reportLines.push(`${rank + 1}. **\`${g.path}\`** — ${g.connections} total incoming/outgoing dependencies`);
    });

    reportLines.push('');
    reportLines.push('## Subsystem Module Breakdown');
    reportLines.push('');

    // Group files by top-level folder
    const folderGroups = new Map<string, CodeFileMeta[]>();
    for (const file of codeFiles) {
      const folder = path.dirname(file.relPath);
      const topFolder = folder === '.' ? 'Root' : folder.split('/')[0];
      const list = folderGroups.get(topFolder) || [];
      list.push(file);
      folderGroups.set(topFolder, list);
    }

    for (const [folderName, files] of folderGroups.entries()) {
      reportLines.push(`### Subsystem: ${folderName}`);
      reportLines.push(`*${files.length} module(s)*\n`);

      for (const f of files.slice(0, 15)) {
        const symbolNames = f.symbols.slice(0, 3).map(s => `\`${s.name}\``).join(', ') || 'No exported symbols';
        reportLines.push(`- **${f.fileName}** (\`${f.relPath}\`): ${symbolNames}`);
      }
      reportLines.push('');
    }

    const reportPath = path.join(vaultDir, 'CODE_MAP.md');
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

    return {
      filesAnalyzed: codeFiles.length,
      totalSymbols,
      totalDependencies: edges.length,
      canvasPath: 'ARCHITECTURE.canvas',
      reportPath: 'CODE_MAP.md',
      godNodes
    };
  }
}
