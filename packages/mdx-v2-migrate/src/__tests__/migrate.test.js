import { createMigrationCompiler } from '../migrate.js'

const compiler = createMigrationCompiler()

async function migrate(string) {
  const result = String(await compiler.process(string))
  return result.trim()
}

describe('mdx-v2-migrate', () => {
  test('escape < sign', async () => {
    const mdx = `Talk to me about <GITHUB_USER>`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"Talk to me about \\\\<GITHUB_USER>"`
    )
  })

  test('escape < sign - different usage', async () => {
    const mdx = `#### vault.route.<operation\\>.<mount\\>`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"#### vault.route.\\\\<operation>.\\\\<mount>"`
    )
  })

  test('Existing JSX', async () => {
    const mdx = `<CodeBlockConfig foo={{ foo: "bar" }}>

  hi

</CodeBlockConfig>`

    expect(await migrate(mdx)).toMatchInlineSnapshot(`
      "<CodeBlockConfig foo={{ foo: \\"bar\\" }}>

      hi

      </CodeBlockConfig>"
    `)
  })

  test('escape <= sign', async () => {
    const mdx = `1 is <= 2`

    expect(await migrate(mdx)).toMatchInlineSnapshot(`"1 is \\\\<= 2"`)
  })

  test('transform HTML comments', async () => {
    const mdx = `<!-- HTML comments are bad -->`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"{/* HTML comments are bad  */}"`
    )
  })

  test('transform HTML comments - multi-line', async () => {
    const mdx = `<!-- HTML comments are bad
  
  Believe it
    
-->`

    expect(await migrate(mdx)).toMatchInlineSnapshot(`
      "{/* HTML comments are bad
        
        Believe it
          
       */}"
    `)
  })

  test('Escape brackets {}', async () => {
    const mdx = `This should be {escaped}`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"This should be \\\\{escaped}"`
    )
  })

  test('Double brackets {{}}', async () => {
    const mdx =
      'The lab provides an example configuration file, `least-req-resolver.hcl`{{open}} for _least_request_ policy.'

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"The lab provides an example configuration file, \`least-req-resolver.hcl\`\\\\{\\\\{open}} for _least_request_ policy."`
    )
  })

  test('inline img element', async () => {
    const mdx = `**Click on the save icon <img src="/img/svg/instruqt-save.svg" style={{display: "inline", margin:0, height: "16px", width: "16px"}} alt="Instruqt editor save icon" />**`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"**Click on the save icon <img src=\\"/img/svg/instruqt-save.svg\\" style={{display: \\"inline\\", margin:0, height: \\"16px\\", width: \\"16px\\"}} alt=\\"Instruqt editor save icon\\" />**"`
    )
  })

  test('jsx in a list element', async () => {
    const mdx = `
  - Watch __Developing a secrets engine for HashiCorp Vault__.
    <VideoEmbed url={video} />
    <br />`

    expect(await migrate(mdx)).toMatchInlineSnapshot(
      `"- Watch **Developing a secrets engine for HashiCorp Vault**. <VideoEmbed url={video} /> <br />"`
    )
  })
})