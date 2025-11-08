"""
Data Analysis Utility Module

This module provides various utility functions for data processing,
statistical analysis, and file operations. It's designed to work with
pandas DataFrames and numpy arrays.
"""

import os
from typing import List, Dict, Optional


class DataProcessor:
    """
    A class for processing and analyzing data from various sources.

    This class handles data loading, cleaning, transformation, and
    basic statistical analysis. It supports CSV, JSON, and Excel formats.
    """

    def __init__(self, data_path: str):
        '''
        Initialize the DataProcessor with a data source path.

        Args:
            data_path: Path to the data file or directory
        '''
        self.data_path = data_path
        self.data = None
        # Store metadata about the loaded data
        self.metadata = {}

    def load_data(self, file_format: str = 'csv') -> bool:
        """
        Load data from the specified file.

        Args:
            file_format: Format of the data file ('csv', 'json', or 'excel')

        Returns:
            True if loading was successful, False otherwise

        Raises:
            FileNotFoundError: If the specified file doesn't exist
            ValueError: If the file format is not supported
        """
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Data file not found: {self.data_path}")

        # Load data based on format
        if file_format == 'csv':
            return self._load_csv()
        elif file_format == 'json':
            return self._load_json()
        else:
            raise ValueError(f"Unsupported format: {file_format}")

    def _load_csv(self) -> bool:
        # Implementation for CSV loading
        # This is a private helper method
        pass

    def _load_json(self) -> bool:
        # Implementation for JSON loading
        pass


def calculate_statistics(numbers: List[float]) -> Dict[str, float]:
    """
    Calculate basic statistical measures for a list of numbers.

    This function computes mean, median, standard deviation,
    minimum, and maximum values.

    Args:
        numbers: A list of numerical values

    Returns:
        A dictionary containing statistical measures

    Example:
        >>> stats = calculate_statistics([1, 2, 3, 4, 5])
        >>> print(stats['mean'])
        3.0
    """
    if not numbers:
        return {}

    total = sum(numbers)  # Calculate total sum
    count = len(numbers)  # Get count of elements
    mean = total / count  # Compute arithmetic mean

    # Sort the numbers for median calculation
    sorted_numbers = sorted(numbers)

    # Calculate median
    if count % 2 == 0:
        median = (sorted_numbers[count//2 - 1] + sorted_numbers[count//2]) / 2
    else:
        median = sorted_numbers[count//2]

    return {
        'mean': mean,
        'median': median,
        'min': min(numbers),
        'max': max(numbers),
        'count': count
    }


# This is a standalone comment block
# It explains the purpose of the following function
# Multiple lines of comments are grouped together
def filter_outliers(data: List[float], threshold: float = 2.0) -> List[float]:
    """Remove outliers from the dataset using z-score method"""
    if len(data) < 3:  # Need at least 3 points for meaningful analysis
        return data

    stats = calculate_statistics(data)
    mean = stats['mean']

    # Calculate standard deviation manually
    variance = sum((x - mean) ** 2 for x in data) / len(data)
    std_dev = variance ** 0.5

    # Filter out values beyond threshold standard deviations
    filtered = [
        x for x in data
        if abs(x - mean) <= threshold * std_dev  # Keep values within threshold
    ]

    return filtered


class FileManager:
    '''Utility class for file operations'''

    @staticmethod
    def read_file(path: str) -> Optional[str]:
        """
        Read the contents of a text file.

        Args:
            path: File path to read

        Returns:
            File contents as string, or None if error occurs
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading file: {e}")  # Log the error
            return None

    @staticmethod
    def write_file(path: str, content: str) -> bool:
        '''Write content to a file'''
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(path), exist_ok=True)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing file: {e}")
            return False


if __name__ == '__main__':
    # Example usage of the module
    # This demonstrates basic functionality

    # Test the statistics function
    sample_data = [10, 20, 30, 40, 50]
    stats = calculate_statistics(sample_data)
    print(f"Statistics: {stats}")

    # Test outlier filtering
    data_with_outliers = [1, 2, 3, 4, 5, 100]  # 100 is an outlier
    cleaned_data = filter_outliers(data_with_outliers)
    print(f"Cleaned data: {cleaned_data}")
