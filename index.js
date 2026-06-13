import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, parse } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))

function readMarkdownFiles(folder) {
  const directory = join(root, folder)
  if (!existsSync(directory)) return []

  return readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const path = join(directory, file)
      return { name: parse(file).name, path, ...parseMarkdown(readFileSync(path, "utf8")) }
    })
}

function parseMarkdown(input) {
  const match = input.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: input.trim() }

  const frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")
    frontmatter[key] = value
  }

  return { frontmatter, body: match[2].trim() }
}

function permissionFromTools(tools) {
  const names = new Set(
    String(tools ?? "")
      .split(",")
      .map((tool) => tool.trim().toLowerCase())
      .filter(Boolean),
  )

  const permission = {}
  if (names.has("read")) permission.read = "allow"
  if (names.has("glob")) permission.glob = "allow"
  if (names.has("grep")) permission.grep = "allow"
  if (names.has("bash")) permission.bash = "allow"
  permission.edit = names.has("write") || names.has("edit") ? "allow" : "deny"

  return permission
}

function modelForAgent(agent, options) {
  const models = options?.models ?? {}
  const configured = models[agent.frontmatter.name || agent.name] ?? options?.defaultModel
  if (configured) return configured

  const frontmatterModel = agent.frontmatter.model
  return frontmatterModel?.includes("/") ? frontmatterModel : undefined
}

function opencodeCommandTemplate(template) {
  return template.replace(/`harness:([a-z-]+)`/g, "`$1`")
}

export default async function HarnessPlugin(_input, options = {}) {
  return {
    config(config) {
      config.command ??= {}
      for (const command of readMarkdownFiles("commands")) {
        const name = `harness:${command.name}`
        config.command[name] ??= {
          template: opencodeCommandTemplate(command.body),
          description: command.frontmatter.description,
        }
      }

      config.agent ??= {}
      for (const agent of readMarkdownFiles("agents")) {
        const name = agent.frontmatter.name || agent.name
        config.agent[name] ??= {
          description: agent.frontmatter.description,
          mode: "subagent",
          prompt: agent.body,
          permission: permissionFromTools(agent.frontmatter.tools),
        }
        const model = modelForAgent(agent, options)
        if (model && !config.agent[name].model) config.agent[name].model = model
      }

      config.skills ??= {}
      config.skills.paths ??= []
      const skillsPath = join(root, "skills")
      if (!config.skills.paths.includes(skillsPath)) config.skills.paths.push(skillsPath)
    },
  }
}
