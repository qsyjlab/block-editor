import { Editor } from '@tiptap/core'
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ExternalHyperlink,
  ImageRun,
  convertInchesToTwip,
  UnderlineType,
  LineRuleType,
} from 'docx'

// Helpers
const convertColor = (color: string): string | undefined => {
  if (!color) return undefined
  if (color.startsWith('#')) return color.substring(1)
  return undefined // DOCX expects hex without #
}

const convertFontSize = (sizeStr: string): number | undefined => {
  if (!sizeStr) return undefined
  // Tiptap usually uses px. DOCX uses half-points.
  // 1px approx 0.75pt = 1.5 half-points
  const px = parseInt(sizeStr.replace('px', ''), 10)
  if (isNaN(px)) return undefined
  return Math.round(px * 1.5)
}

const convertLineHeight = (lh: string): { line: number; rule: any } | undefined => {
  if (!lh) return undefined

  // Handle percent (e.g. "150%")
  if (lh.endsWith('%')) {
    const val = parseFloat(lh)
    if (isNaN(val)) return undefined
    return {
      line: Math.round((val / 100) * 240),
      rule: LineRuleType.AUTO,
    }
  }

  // Handle pixels (e.g. "20px")
  if (lh.endsWith('px')) {
    const val = parseFloat(lh)
    if (isNaN(val)) return undefined
    // 1px = 15 twips (approx)
    return {
      line: Math.round(val * 15),
      rule: LineRuleType.AT_LEAST,
    }
  }

  // Handle unitless (multipliers, e.g. "1.5")
  const val = parseFloat(lh)
  if (isNaN(val)) return undefined

  return {
    line: Math.round(val * 240),
    rule: LineRuleType.AUTO,
  }
}

export class DocxSerializer {
  constructor(private editor: Editor) {}

  public async serialize(): Promise<Document> {
    const json = this.editor.getJSON()
    const children = await this.parseNodes(json.content || [])

    return new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Microsoft YaHei', // Default font
              size: 24, // 12pt = 24 half-points
            },
            paragraph: {
              spacing: {
                line: 360, // 1.5 lines default
              },
            },
          },
          heading1: {
            run: {
              font: 'Microsoft YaHei',
              size: 48, // 24pt
              bold: true,
            },
            paragraph: {
              spacing: { before: 240, after: 120 },
            },
          },
          heading2: {
            run: {
              font: 'Microsoft YaHei',
              size: 36, // 18pt
              bold: true,
            },
            paragraph: {
              spacing: { before: 240, after: 120 },
            },
          },
          heading3: {
            run: {
              font: 'Microsoft YaHei',
              size: 28, // 14pt
              bold: true,
            },
            paragraph: {
              spacing: { before: 240, after: 120 },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // 210mm (A4)
                height: 16838, // 297mm (A4)
              },
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: children,
        },
      ],
    })
  }

  private async parseNodes(nodes: any[]): Promise<any[]> {
    const children: any[] = []

    for (const node of nodes) {
      switch (node.type) {
        case 'paragraph':
          children.push(this.parseParagraph(node))
          break
        case 'heading':
          children.push(this.parseHeading(node))
          break
        case 'bulletList':
          children.push(...(await this.parseList(node, 'bullet')))
          break
        case 'orderedList':
          children.push(...(await this.parseList(node, 'number')))
          break
        case 'taskList':
          children.push(...(await this.parseList(node, 'task')))
          break
        case 'table':
          children.push(await this.parseTable(node))
          children.push(new Paragraph({})) // Spacer
          break
        case 'blockquote':
          children.push(this.parseBlockquote(node))
          break
        case 'image':
          const img = await this.parseImage(node)
          if (img) children.push(img)
          break
        case 'codeBlock':
          // Basic support for code blocks as paragraphs with monospace font
          children.push(this.parseCodeBlock(node))
          break
        case 'callout':
          children.push(...(await this.parseCallout(node)))
          break
        case 'horizontalRule':
          children.push(this.parseHorizontalRule())
          break
      }
    }

    return children
  }

  private parseParagraph(node: any): Paragraph {
    const runs = this.parseInline(node.content || [])
    const alignment = this.getAlignment(node.attrs?.textAlign)
    const spacing = node.attrs?.lineHeight ? convertLineHeight(node.attrs.lineHeight) : undefined
    // Indent extension stores indent level (0-7) as `indent` attribute
    const indentLevel: number = node.attrs?.indent || 0

    return new Paragraph({
      children: runs,
      alignment: alignment,
      spacing: spacing,
      indent: indentLevel > 0 ? { left: convertInchesToTwip(0.5 * indentLevel) } : undefined,
    })
  }

  private parseHeading(node: any): Paragraph {
    const runs = this.parseInline(node.content || [])
    const levels: Record<number, any> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    }
    const alignment = this.getAlignment(node.attrs?.textAlign)
    const spacing = node.attrs?.lineHeight ? convertLineHeight(node.attrs.lineHeight) : undefined

    return new Paragraph({
      children: runs,
      heading: levels[node.attrs?.level] || HeadingLevel.HEADING_1,
      alignment: alignment,
      spacing: spacing,
    })
  }

  private async parseList(node: any, type: 'bullet' | 'number' | 'task'): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = []

    // Tiptap lists are recursive.
    // structure: list -> listItem -> (paragraph | list)
    // We need to flatten this for DOCX but maintain numbering/bullet levels

    const processListItem = async (listItem: any, level: number) => {
      if (!listItem.content) return

      for (const child of listItem.content) {
        if (child.type === 'paragraph') {
          const runs = this.parseInline(child.content || [])

          if (type === 'task') {
            const isChecked = listItem.attrs?.checked
            const prefix = isChecked ? '☑ ' : '☐ '
            runs.unshift(new TextRun({ text: prefix, font: 'Segoe UI Symbol' }))
          }

          paragraphs.push(
            new Paragraph({
              children: runs,
              bullet:
                type !== 'task'
                  ? {
                      level: level,
                    }
                  : undefined,
              numbering:
                type === 'number'
                  ? {
                      reference: 'default-numbering',
                      level: level,
                    }
                  : undefined,
              indent:
                type === 'task' ? { left: convertInchesToTwip(0.25 * (level + 1)) } : undefined,
            }),
          )
        } else if (
          child.type === 'bulletList' ||
          child.type === 'orderedList' ||
          child.type === 'taskList'
        ) {
          // Recursive call for nested list
          // For DOCX, we just increase the level of the items in the nested list
          // We don't recurse parseList directly because parseList returns Paragraph[],
          // and we are inside a loop building a flat array.
          // Actually, we can reuse the logic if we extract it.
          // But simplified:
          if (child.content) {
            for (const nestedItem of child.content) {
              await processListItem(nestedItem, level + 1)
            }
          }
        }
      }
    }

    if (node.content) {
      for (const item of node.content) {
        await processListItem(item, 0)
      }
    }

    return paragraphs
  }

  private async parseTable(node: any): Promise<Table> {
    const rows: TableRow[] = []

    if (node.content) {
      for (const row of node.content) {
        const cells: TableCell[] = []
        if (row.content) {
          for (const cell of row.content) {
            const cellChildren = await this.parseNodes(cell.content || [])
            const validChildren = cellChildren.filter(
              (c) => c instanceof Paragraph || c instanceof Table,
            )

            // Handle rowspan/colspan
            // Tiptap uses colspan/rowspan attrs
            const colspan = cell.attrs?.colspan || 1
            const rowspan = cell.attrs?.rowspan || 1

            cells.push(
              new TableCell({
                children: validChildren,
                columnSpan: colspan,
                rowSpan: rowspan,
                width: {
                  size: 100 / row.content.length, // Simplified width
                  type: WidthType.PERCENTAGE,
                },
                shading: cell.type === 'tableHeader' ? { fill: 'F7F9FA' } : undefined,
                verticalAlign: 'center', // Default vertical align
              }),
            )
          }
        }
        rows.push(new TableRow({ children: cells }))
      }
    }

    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
      },
    })
  }

  private parseBlockquote(node: any): Paragraph {
    // Handle multi-paragraph blockquotes?
    // Tiptap blockquote contains paragraphs.
    // We'll flatten them into a single DOCX paragraph with line breaks or separate paragraphs with border.
    // Let's treat the first paragraph specially or iterate.
    // For simplicity, let's take all text content.

    const content = node.content || []
    // Collect all runs from all paragraphs in the blockquote
    let allRuns: any[] = []
    content.forEach((child: any, index: number) => {
      if (child.type === 'paragraph') {
        if (index > 0) {
          allRuns.push(new TextRun({ text: '\n', break: 1 }))
        }
        allRuns = allRuns.concat(this.parseInline(child.content || []))
      }
    })

    return new Paragraph({
      children: allRuns,
      indent: { left: 720 }, // 0.5 inch
      border: {
        left: { color: '00B96B', space: 240, style: BorderStyle.SINGLE, size: 24 },
      },
    })
  }

  private parseCodeBlock(node: any): Paragraph {
    const text = node.content?.[0]?.text || ''
    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          font: 'Consolas',
          size: 20, // 10pt
        }),
      ],
      shading: {
        fill: 'F7F9FA',
      },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E8E8E8' },
      },
      spacing: {
        before: 240,
        after: 240,
      },
    })
  }

  private async parseCallout(node: any): Promise<Paragraph[]> {
    const calloutType: string = node.attrs?.calloutType || 'info'
    const labelMap: Record<string, string> = {
      info: '📘 信息',
      success: '✅ 成功',
      warning: '⚠️ 警告',
      danger: '❌ 危险',
    }
    const borderColorMap: Record<string, string> = {
      info: '3B82F6',
      success: '22C55E',
      warning: 'F59E0B',
      danger: 'EF4444',
    }
    const bgMap: Record<string, string> = {
      info: 'EFF6FF',
      success: 'F0FDF4',
      warning: 'FFFBEB',
      danger: 'FEF2F2',
    }
    const borderColor = borderColorMap[calloutType] || '3B82F6'
    const bg = bgMap[calloutType] || 'EFF6FF'
    const label = labelMap[calloutType] || 'ℹ️ 信息'

    const result: Paragraph[] = []

    // Header row with type label
    result.push(
      new Paragraph({
        children: [new TextRun({ text: label, bold: true, size: 22 })],
        shading: { fill: bg },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
          top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
          right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        },
        spacing: { before: 120, after: 0 },
        indent: { left: 180 },
      }),
    )

    // Content paragraphs
    for (const child of node.content || []) {
      if (child.type === 'paragraph') {
        const runs = this.parseInline(child.content || [])
        result.push(
          new Paragraph({
            children: runs,
            shading: { fill: bg },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
              top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
            },
            spacing: { before: 0, after: 0 },
            indent: { left: 180 },
          }),
        )
      }
    }

    // Closing spacer with bottom border
    result.push(
      new Paragraph({
        children: [],
        shading: { fill: bg },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
          top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
        },
        spacing: { before: 0, after: 120 },
        indent: { left: 180 },
      }),
    )

    return result
  }

  private parseHorizontalRule(): Paragraph {
    return new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D1D5DB' },
      },
      spacing: { before: 240, after: 240 },
    })
  }

  private async parseImage(node: any): Promise<Paragraph | null> {
    const src = node.attrs?.src
    if (!src) return null

    try {
      // Fetch image data
      const response = await fetch(src)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()

      return new Paragraph({
        children: [
          new ImageRun({
            data: buffer,
            transformation: {
              width: 400, // Default width
              height: 300, // Default height - ideally should calculate ratio
            },
            type: 'png', // Default type
          }),
        ],
      })
    } catch (e) {
      console.error('Failed to load image for export', e)
      return new Paragraph({
        children: [new TextRun({ text: `[Image: ${src}]`, color: 'red' })],
      })
    }
  }

  private parseInline(nodes: any[]): (TextRun | ExternalHyperlink)[] {
    return nodes.map((node) => {
      if (node.type === 'text') {
        const marks = node.marks || []
        const options: any = {
          text: node.text,
        }

        marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              options.bold = true
              break
            case 'italic':
              options.italics = true
              break
            case 'strike':
              options.strike = true
              break
            case 'underline':
              options.underline = {
                type: UnderlineType.SINGLE,
              }
              break
            case 'subscript':
              options.subScript = true
              break
            case 'superscript':
              options.superScript = true
              break
            case 'textStyle':
              if (mark.attrs?.color) {
                options.color = convertColor(mark.attrs.color)
              }
              if (mark.attrs?.fontSize) {
                options.size = convertFontSize(mark.attrs.fontSize)
              }
              if (mark.attrs?.fontFamily) {
                options.font = mark.attrs.fontFamily
              }
              break
            case 'highlight':
              // Highlight color might be in attrs.color if multicolor is enabled
              const hlColor = mark.attrs?.color || 'yellow'
              // docx highlight expects specific enum values usually, but hex might work in newer versions or falls back
              // Actually docx HighlightColor enum is limited.
              // 'yellow' | 'green' | 'cyan' | 'magenta' | 'blue' | 'red' | ...
              // If it's a hex, we might need 'shading' instead of 'highlight'.
              // TextRun highlight is strictly HighlightColor enum.
              // TextRun shading is { fill: "hex" }

              if (['yellow', 'green', 'cyan', 'magenta', 'blue', 'red'].includes(hlColor)) {
                options.highlight = hlColor
              } else {
                // Use shading for custom hex colors
                options.shading = {
                  fill: convertColor(hlColor) || 'FFFF00',
                }
              }
              break
          }
        })

        // Handle Link
        const linkMark = marks.find((m: any) => m.type === 'link')
        if (linkMark) {
          return new ExternalHyperlink({
            children: [
              new TextRun({
                ...options,
                style: 'Hyperlink',
                color: '0000FF',
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
            link: linkMark.attrs.href,
          })
        }

        return new TextRun(options)
      }
      return new TextRun('')
    })
  }

  private getAlignment(textAlign?: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
    switch (textAlign) {
      case 'center':
        return AlignmentType.CENTER
      case 'right':
        return AlignmentType.RIGHT
      case 'justify':
        return AlignmentType.JUSTIFIED
      default:
        return AlignmentType.LEFT
    }
  }
}
