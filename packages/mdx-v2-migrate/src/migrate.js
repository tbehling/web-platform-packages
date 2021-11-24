import readdirp from 'readdirp'
import path from 'path'
import fs from 'fs'
import { remark } from 'remark'
import matter from 'gray-matter'
import { text } from 'mdast-util-to-markdown/lib/handle/text.js'

const commentExpression = /\s*<!--([\s\S]*?)-->\s*/

export function createMigrationCompiler() {
  return remark().data('settings', {
    bullet: '-',
    emphasis: '_',
    unsafe: [
      { character: '>', before: '<', inConstruct: 'phrasing' },
      { character: '<', after: '[a-zA-Z0-9]', inConstruct: 'phrasing' },
      { character: '<', after: '[a-zA-Z0-9]', inConstruct: 'phrasing' },
      // brackets are used to denote a JS expression, need to escape all current usages
      { character: '{', after: '{', inConstruct: 'phrasing' },
      { character: '{', after: '[a-zA-Z0-9]', inConstruct: 'phrasing' },
    ],
    listItemIndent: 'one',
    incrementListMarker: false,
    rule: '-',
    resourceLink: true,
    fences: true,
    handlers: {
      /**
       * Rewrites HTML comments into MDX comments
       *
       * <!-- comment --> -> {/* comment *\/}
       */
      html(node) {
        const match = node.value.match(commentExpression)

        if (match) {
          return `{/*${match[1]}*/}`
        }

        return node.value
      },
      /**
       * We're doing a lot of un-escaping here, which seems to be fine as most of the valid markdown
       * nodes have already been parsed and are no longer *text* nodes. The goal is to have the resulting
       * re-generated MDX be as close to the original source as possible, we don't want to introduce escaping
       * that might confuse authors if it's not necessary.
       */
      text(node, _, context, safeOptions) {
        /**
         * Unescape JSX tags that got escaped for unknown reasons (Not "valid" HTML look-a-likes?)
         * and which are only in a phrasing node (i.e. they are most likely an opening JSX tag)
         *
         * match: \<CodeBlockConfig foo={{ foo: "bar" }}>
         * no match: **\<foo>**
         */
        let safe = text(node, _, context, safeOptions)
        if (
          (safe.match(/^\\<\w.*?>$/m) ||
            safe.match(/\\<\w.*?\/>/) ||
            /**
             * matches a tag which is formatted so that properties spread across multiple lines
             *
             * e.g.
             *
             * <video
             *   muted
             *   playsInline
             *   autoPlay
             *   loop
             *   class="boundary-clickthrough-video boundary-clickthrough-desktop-video"
             * >
             */
            safe.match(/^\\<\w+(\s+\w+(=.+)?.+?\n)+/)) &&
          ['phrasing', 'emphasis', 'strong'].includes(
            context.stack.slice(-1)[0]
          )
        ) {
          return node.value
        }
        // ensure our custom aside shorthand does not get escaped
        if (safe.includes('\\->')) {
          safe = safe.replace('\\->', '->')
        }
        if (safe.includes('\\~>')) {
          safe = safe.replace('\\~>', '~>')
        }

        // Unescape _ characters in text nodes, they render without issue
        if (safe.includes('\\_')) {
          safe = safe.replace(/\\_/g, '_')
        }
        // Unescape * characters in text nodes, they're not in a strong/emphasis node and so are safe
        if (safe.includes('\\*')) {
          safe = safe.replace(/\\\*/g, '*')
        }
        // Unescape [ characters in text nodes, they're not part of a link node and so are safe
        if (safe.includes('\\[')) {
          safe = safe.replace(/\\\[/g, '[')
        }

        // allow usage of <= sign
        safe = safe.replace('<=', '\\<=')

        return safe
      },
    },
  })
}

/**
 * Migrates existing MDX content to be compatible with MDX v2
 *
 * @param {string[]} files - An optional array of files to filter for
 */
export async function migrate(files) {
  const contentDir = path.join(process.cwd(), 'content')

  const compiler = createMigrationCompiler()

  for await (const entry of readdirp(contentDir, {
    fileFilter: ['*.md', '*.mdx', ...files],
  })) {
    if (files.length > 0 && !files.find((el) => entry.fullPath.includes(el)))
      continue

    console.log(entry.fullPath)

    const fileContents = await fs.promises.readFile(entry.fullPath, 'utf-8')

    const { data, content } = matter(fileContents)

    const updatedFileContents = String(await compiler.process(content))

    await fs.promises.writeFile(
      entry.fullPath,
      matter.stringify(updatedFileContents, data, {
        delimiters: ['---', '---\n\n'],
      }),
      'utf-8'
    )
  }
}