interface HTMLNode {
  tag: string
  content?: string
  children?: HTMLNode
  sibling?: HTMLNode
  parent?: HTMLNode
  style?: Record<string, string>
}

export class HTMLTree {
  active?: HTMLNode
  root?: HTMLNode

  static getLastChild(node: HTMLNode): HTMLNode | undefined {
    let child = node.children
    while (child?.sibling) {
      child = child.sibling
    }
    return child
  }

  static getLastSibling(node: HTMLNode): HTMLNode | undefined {
    let sibling = node.sibling
    while (sibling?.sibling) {
      sibling = sibling.sibling
    }
    return sibling
  }

  /**
   * Insert a sibling node and set it as the new active node
   * @param node sibling HTMLNode to be inserted
   * @return node inserted node
   */
  insert(node: HTMLNode): HTMLNode {
    // If tree is currently empty, we set it as both the root and active node
    if (!this.active) {
      this.root = node
      this.active = node
      return node
    }

    // Set the node's parent to be the same at parent
    node.parent = this.active.parent

    this.active.sibling = node
    this.active = node
    return node
  }

  /**
   * Append child node to current active node
   * @param node child HTMLNode to be inserted
   * @return node inserted node
   * @throws Error if the tree is currently empty
   */
  insertChild(node: HTMLNode): HTMLNode {
    if (!this.active) throw new Error('Tree is empty')

    if (!this.active.children) {
      this.active.children = node
    } else {
      const lastChild = HTMLTree.getLastChild(this.active)
      if (lastChild) lastChild.sibling = node
    }

    // Set the child node's parent to the current active node
    node.parent = this.active
    return node
  }

  /**
   * Explicitly select node as the active node
   */
  select(node: HTMLNode) {
    this.active = node
  }

  /**
   * Recursively render node to HTML string
   * @param node HTMLNode to start rendering from
   */
  renderNode(node: HTMLNode): string {
    let html = ''
    const { tag, content, children, sibling, style } = node

    if (style) {
      const css = Object.keys(style).reduce(
        (cssStr, property) => `${cssStr} ${property}: ${style[property]};`,
        ''
      )
      html += `<${tag} style="${css.trim()}">`
    } else {
      html += `<${tag}>`
    }

    if (content) html += `${content}`
    if (children) {
      html += this.renderNode(children)
    }
    html += `</${tag}>`

    if (sibling) {
      html += this.renderNode(sibling)
    }

    return html
  }

  /**
   * Render tree to HTML string
   */
  toHTML(): string {
    if (!this.root) return ''
    return this.renderNode(this.root)
  }
}
