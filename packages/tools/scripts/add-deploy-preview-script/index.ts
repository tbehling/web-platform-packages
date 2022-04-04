import path from 'path'
import fs from 'fs'

const files = [
  {
    template: path.join(__dirname, 'deploy-preview-script.template.txt'),
    destination: path.join(process.cwd(), 'scripts', 'website-build.sh'),
  },
  {
    template: path.join(__dirname, 'local-preview-script.template.txt'),
    destination: path.join(process.cwd(), 'scripts', 'website-start.sh'),
  },
]

export default async function main(product: string) {
  for (const file of files) {
    const { template: templatePath, destination: destinationPath } = file

    const template = String(await fs.promises.readFile(templatePath))
    const script = template.replace('{PRODUCT}', product)

    console.log('writing script to:', destinationPath)
    await fs.promises.writeFile(destinationPath, script, { encoding: 'utf-8' })
    // ensure the script file is executable after write
    await fs.promises.chmod(destinationPath, '755')
  }
}
