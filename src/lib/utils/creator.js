import createElement from './element-creator.js'
import DOM from './dom-helper.js'
import { resolve } from './resolver.js'
import { removeItem } from './array-helper.js'

const create = ({ ast, state, children, subscriber }) => {
	const element = createElement(ast[0], state, subscriber)

	for (let i = 1; i < ast.length; i++) {
		const node = ast[i]
		switch (Object.prototype.toString.call(node)) {
			case '[object String]': {
				DOM.append(element, document.createTextNode(node))
				break
			}
			case '[object Array]': {
				if (Object.prototype.toString.call(node[0]) === '[object Object]') {
					// Create child element
					DOM.append(element, create({ ast: node, state, children, subscriber }))
				} else if (Object.prototype.toString.call(node[0]) === '[object String]') {
					const name = node[node.length - 1]
					const textNode = document.createTextNode('')
					const { parentNode, subscriberNode } = resolve({
						path: node,
						name: name,
						parentNode: state.$data,
						subscriberNode: subscriber
					})
					subscriberNode.push((value) => {
						textNode.textContent = value
					})
					if (typeof parentNode[name] === 'undefined') Object.defineProperty(parentNode, name, {
						get() {
							return subscriberNode.value
						},
						set(value) {
							if (subscriberNode.value === value) return
							subscriberNode.value = value
							for (let j of subscriberNode) j.call(state, value)
						},
						enumerable: true
					})
					DOM.append(element, textNode)
				}
				break
			}
			case '[object Object]': {
				const placeholder = document.createTextNode('')
				Object.defineProperty(state, node.name, {
					get() {
						return children[node.name]
					},
					set(value) {
						if (children[node.name] && children[node.name].value === value) return
						const fragment = document.createDocumentFragment()

						// Identify types of original value and new value
						const oldValType = Object.prototype.toString.call(children[node.name])
						const newValType = Object.prototype.toString.call(value)

						// Update components
						if (children[node.name]) {
							if (oldValType === '[object Array]') {
								if (newValType === '[object Array]') {
									for (let j of value) {
										DOM.append(fragment, j.$element)
										removeItem(children[node.name], j)
									}
								} else if (newValType === '[object Object]') {
									DOM.append(fragment, value.$element)
									removeItem(children[node.name], value)
								}
								for (let j of children[node.name]) DOM.remove(j.$element)
							} else if (newValType === '[object Array]') {
								for (let j of value) DOM.append(fragment, j.$element)
								if (value.indexOf(children[node.name]) === -1) DOM.remove(children[node.name].$element)
							} else {
								if (newValType === '[object Object]') DOM.append(fragment, value.$element)
								DOM.remove(children[node.name].$element)
							}
						} else if (newValType === '[object Array]') for (let j of value) DOM.append(fragment, j.$element)
						else if (newValType === '[object Object]') DOM.append(fragment, value.$element)

						// Update stored value
						if (newValType === '[object Array]') children[node.name] = value.slice(0)
						else children[node.name] = value
						// Append to current component
						DOM.before(placeholder, fragment)
					},
					enumerable: true
				})
				DOM.append(element, placeholder)
				break
			}
			default: {
				throw new TypeError('Not a standard ef.js AST!')
			}
		}
	}

	return element
}

export default create
