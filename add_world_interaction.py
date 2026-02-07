#!/usr/bin/env python3
"""
Script to add World Interaction section to all Book 1 scene briefs.
"""

import os
import re

SCENE_BRIEFS_DIR = "/Users/charlotteokeyo/Downloads/26_for_2026/Scene_Briefs/Book_1"

NEW_SECTION = """---

####

 **World Interaction & Secondary Characters**

**Secondary Character Interactions:**

- [Identify at least ONE secondary character who appears: colleague, neighbor, stranger, service worker, fan, or antagonist]
- [Describe their role and how they interact with the POV character]
- [Note their distinct voice, mannerism, or personality trait]

**Dialogue Moments:**

- [What worldbuilding is revealed through conversation?]
- [What local gossip, rumors, or information is exchanged?]
- [How does this character's speech pattern differ from the main cast?]

**Character Interaction Beats:**

- [How does the POV character treat this secondary character?]
- [What does this interaction reveal about the POV character's personality or reputation?]
- [Is there a small kindness, cruelty, or moment of connection?]

**Environmental Engagement:**

- [What background activity or environmental detail is noticed?]
- [What objects are touched, used, or noticed in passing?]
- [How does the POV character physically interact with their surroundings?]

**Purpose:**
This section ensures the scene includes external dialogue and interaction, preventing pure introspection and making the world feel lived-in and populated.

"""

def add_world_interaction_section(filepath):
    """Add the World Interaction section after Character Details."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the Character Details section and insert the new section after it
    # Look for the pattern: "#### **Character Details**" followed by content, then "---" then next section
    
    # Pattern: find "---\n\n#### **Setting & Atmosphere**"
    # Insert our new section before this
    
    pattern = r'(---\s*\n\s*#### \*\*Setting & Atmosphere\*\*)'
    
    if re.search(pattern, content):
        new_content = re.sub(pattern, NEW_SECTION + r'\n\1', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True
    else:
        print(f"Pattern not found in {os.path.basename(filepath)}")
        return False

def main():
    """Process all scene brief files."""
    
    if not os.path.exists(SCENE_BRIEFS_DIR):
        print(f"Directory not found: {SCENE_BRIEFS_DIR}")
        return
    
    files = sorted([f for f in os.listdir(SCENE_BRIEFS_DIR) if f.endswith('.md')])
    
    success_count = 0
    fail_count = 0
    
    for filename in files:
        filepath = os.path.join(SCENE_BRIEFS_DIR, filename)
        print(f"Processing {filename}...")
        
        if add_world_interaction_section(filepath):
            success_count += 1
            print(f"  ✓ Updated")
        else:
            fail_count += 1
            print(f"  ✗ Failed")
    
    print(f"\n{'='*50}")
    print(f"Total files processed: {len(files)}")
    print(f"Successfully updated: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
