import { Node, mergeAttributes } from '@tiptap/core';
import languageStore from '@/store/LanguageStore';

const t = computed(() => {
  return key => {
    const translation = languageStore.state.translations[key];
    return translation || key;  // Fallback to key if translation not found
  };
});

const insertCustomDataExtension = Node.create({
  name: 'insertCustomDataExtension',
  group: 'block', // Defines the node as a block-level element
  content: 'block+', // Allow multiple paragraphs inside this node
  addAttributes() {
    return {
      headingText: {
        default: t.value('This is an editable heading'), // Default heading text
      },
      class: {
        default: '', // Custom class (empty by default)
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-custom-extension]', // Targeting the custom data attribute
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-custom-extension': '', // Custom data attribute
        class: node.attrs.class || '', // Add a custom class
      }),
      // Allow Tiptap to manage the paragraph content within the div
      0,
    ];
  },
  toDOM(node) {
    return [
      'div',
      { 'data-custom-extension': '', class: node.attrs.class },
      // This will render the inner content
      0,
    ];
  },
  addCommands() {
    return {
      setinsertCustomDataExtension:
        (headingText, paragraphContent, customClass) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'insertCustomDataExtension',
            attrs: {
              headingText: headingText || t.value('Default Heading'), // Use provided or default heading
              class: customClass || '', // Use provided class or default
            },
            content: paragraphContent || [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: t.value('Start typing here...') }], // Default content in the paragraph
              },
            ], // Use provided or default paragraph content
          });
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Backspace': (state, dispatch) => {
        const editor = state['editor'];
        // Get the resolved selection

        const { $from, $to } = editor.state.selection;
        console.log('Backspace pressed', $from, $to);







        // Function to traverse up the parent chain and check for the custom node
        const hasCustomDataExtensionInParents = () => {
          let depth = $from.depth; // Start from the current node's depth
          while (depth > 0) {
            const parentNode = $from.node(depth); // Get the node at the current depth
            if (parentNode.type.name === 'insertCustomDataExtension') {

              console.log('parentNode',$from.parentOffset, $from, parentNode);
              console.log($from.node().type.name)


              //get above sibling
              // const aboveSibling = $from.node(depth - 1).child($from.index(depth - 1) - 1);


              const firstChild = parentNode.content.firstChild;

              // Check if the current node is the first child
              if (firstChild && firstChild.type.name === $from.node().type.name) {
                // Check if the cursor is at the start of the first child
                if ($from.index(depth) === 0 && $from.parentOffset === 0) {

                  //check if from and to are same
                  if($from.pos === $to.pos){
                    //check child of parentNode
                    console.log('parentNode',parentNode.content);
                    //if block is empty
                    if(parentNode.content.size === 2){
                      //delete the block
                      const { tr } = editor.state;
                      tr.delete($from.before(), $from.after());
                      editor.view.dispatch(tr);
                      return false; // Prevent deletion
                      
                    

                    }

                    return true; // Prevent deletion
                  }


                //check if selected node is heading
                if($from.node().type.name === 'heading'){
                  //convert tag to text
                  const headingText = $from.node().textContent;
                  console.log('headingText',headingText);
                  //remove heading and replace with paragraph
                  const { tr } = editor.state;
                  tr.setNodeMarkup($from.before(), editor.schema.nodes.paragraph);
                  editor.view.dispatch(tr);
                  //check child of parentNode

                


                }




                  console.log('Backspace pressed at the start of the first paragraph in insertCustomDataExtension');
                  return false; // Prevent deletion
                }
              }
              console.log('Backspace pressed in a custom node or its parent');
              return false; // Found the custom node, no need to continue
            }
            depth -= 1; // Move up one level
          }
          return false; // No custom node found in the parent chain
        };
        // Check if any parent node is of type insertCustomDataExtension
        if (hasCustomDataExtensionInParents()) {
          return true; // Prevent deletion if the node or its parent is custom
        }
        return false; // Allow default behavior for other cases
      },
    };
  }


});
export default insertCustomDataExtension;