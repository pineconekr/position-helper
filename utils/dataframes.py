import io
import pandas as pd


def parse_df_raw(json_data: str) -> pd.DataFrame:
    """JSON(str, orient='split') → pandas.DataFrame (no cache).
    Thin wrapper to centralize read options.
    """
    return pd.read_json(io.StringIO(json_data), orient='split')


def get_numeric_df_raw(json_data: str) -> pd.DataFrame:
    """Return numeric-casted DataFrame (non-numeric coerced to NaN)."""
    return parse_df_raw(json_data).apply(pd.to_numeric, errors='coerce')
