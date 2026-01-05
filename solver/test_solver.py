import unittest
import os
from solver import BoggleSolver

class TestBoggleSolver(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure dictionary exists
        cls.dict_path = os.path.join(os.path.dirname(__file__), "dictionary.txt")
        if not os.path.exists(cls.dict_path):
            raise FileNotFoundError(f"Dictionary not found at {cls.dict_path}")
        cls.solver = BoggleSolver(cls.dict_path)

    def test_solve_4x4(self):
        # Grid: 
        # t e s t
        # r a l s
        # i n g x
        # x x x x
        grid = "testralsingxxxxx" 
        results = self.solver.solve(grid)
        words = [w for w, s in results]
        
        # Expected words should include "test", "testing", "star", "start" etc if adjacent
        # "test" -> t(0,0)-e(0,1)-s(0,2)-t(0,3) - valid
        self.assertIn("tales", words)
        self.assertIn("test", words)

    def test_solve_5x5(self):
        # improved grid
        # h e l l o
        # w o r l d
        # a b c d e
        # f g h i j
        # k l m n o
        grid = "helloworldabcdefghijklmno"
        results = self.solver.solve(grid)
        words = [w for w, s in results]
        
        self.assertIn("hello", words)
        self.assertIn("world", words)
        # "held" is not valid. 
        self.assertIn("hell", words)

    def test_min_length(self):
        grid = "abcdefghijklmnop"
        results = self.solver.solve(grid)
        words = [w for w, s in results]
        for w in words:
            self.assertTrue(len(w) >= 3, f"Word {w} is shorter than 3 chars")

if __name__ == '__main__':
    unittest.main()
