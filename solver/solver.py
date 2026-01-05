import sys
import os

class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        self.is_end_of_word = True

class BoggleSolver:
    def __init__(self, dictionary_path):
        self.dictionary_element_set = set() # Use a set or Trie. Trie is faster for pruning.
        # Actually, let's use a set for full word existence and a prefix set/trie for pruning.
        # Simple set of prefixes is easier to implement quickly than a full Trie class if we don't need metadata.
        # But a recursive Trie approach is classic for Boggle. 
        self.root = TrieNode()
        self.load_dictionary(dictionary_path)

    def load_dictionary(self, path):
        if not os.path.exists(path):
            print(f"Error: Dictionary not found at {path}")
            sys.exit(1)
        
        with open(path, 'r') as f:
            for line in f:
                word = line.strip().lower()
                if len(word) >= 3:
                     self.insert_word(word)
    
    def insert_word(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end_of_word = True

    def get_score(self, word):
        length = len(word)
        if length < 3:
            return 0
        elif length in [3, 4]:
            return 1
        elif length == 5:
            return 2
        elif length == 6:
            return 3
        elif length == 7:
            return 5
        else: # length >= 8
            return 11

    def solve(self, grid_str):
        # Determine grid size
        length = len(grid_str)
        if length == 16:
            size = 4
        elif length == 25:
            size = 5
        elif length == 36:
            size = 6
        else:
            return f"Error: Invalid grid length {length}. Expected 16 (4x4) or 25 (5x5)."

        grid_str = grid_str.lower()
        grid = [list(grid_str[i:i+size]) for i in range(0, length, size)]
        
        found_words = set()
        visited = [[False for _ in range(size)] for _ in range(size)]

        for r in range(size):
            for c in range(size):
                self._dfs(r, c, grid, visited, "", self.root, found_words, size)
        
        # Convert to list of (word, score)
        scored_words = []
        for word in found_words:
            scored_words.append((word, self.get_score(word)))
            
        # Sort by Score (desc), then Length (desc), then Alphabetical (asc)
        # Note: python sort is stable.
        # reverse sort by score and length
        return sorted(scored_words, key=lambda x: (-x[1], -len(x[0]), x[0]))

    def _dfs(self, r, c, grid, visited, current_word, current_node, found_words, size):
        if visited[r][c]:
            return

        char = grid[r][c]
        if char not in current_node.children:
            return

        next_node = current_node.children[char]
        new_word = current_word + char

        if next_node.is_end_of_word:
            found_words.add(new_word)

        visited[r][c] = True

        # 8 directions
        directions = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        ]

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                self._dfs(nr, nc, grid, visited, new_word, next_node, found_words, size)

        visited[r][c] = False

def main():
    if len(sys.argv) < 2:
        print("Usage: python solver.py <grid_string>")
        print("Example: python solver.py abcdefghijklmnop")
        sys.exit(1)
    
    grid = sys.argv[1]
    
    # Check if a dictionary path is provided, otherwise default locally
    dict_path = "dictionary.txt"
    if len(sys.argv) > 2:
        dict_path = sys.argv[2]
    elif os.path.exists(os.path.join(os.path.dirname(__file__), "dictionary.txt")):
        dict_path = os.path.join(os.path.dirname(__file__), "dictionary.txt")
        
    solver = BoggleSolver(dict_path)
    results = solver.solve(grid)
    
    if isinstance(results, str) and results.startswith("Error"):
        print(results)
    else:
        print(f"Found {len(results)} solutions")
        print("Sort results by: score")
        print(f"{'Word':<20} {'Score'}")
        print("-" * 30)
        
        RED = "\033[91m"
        RESET = "\033[0m"
        
        for word, score in results:
            print(f"{word:<20} {RED}{score}{RESET}")

if __name__ == "__main__":
    main()
