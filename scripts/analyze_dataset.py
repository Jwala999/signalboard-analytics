import sys
import json
import base64
import argparse
import io
import pandas as pd

def analyze():
    parser = argparse.ArgumentParser()
    parser.add_argument("--filename", type=str, default="dataset.csv")
    args = parser.parse_args()
    filename = args.filename.lower()

    # Read base64 from stdin
    base64_data = sys.stdin.read().strip()
    if not base64_data:
        print(json.dumps({"error": "No data provided to python script"}))
        return

    try:
        raw_bytes = base64.b64decode(base64_data)
    except Exception as e:
        print(json.dumps({"error": f"Failed to decode base64: {str(e)}"}))
        return

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(raw_bytes))
        else:
            df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse file: {str(e)}"}))
        return

    if df.empty:
        print(json.dumps({"error": "Empty dataset"}))
        return

    # Basic cleaning: drop completely empty rows and columns
    df.dropna(how='all', inplace=True)
    df.dropna(how='all', axis=1, inplace=True)
    
    # Fill NaN with empty string for JSON serialization compatibility
    df_filled = df.fillna("")
    
    raw_rows = df_filled.to_dict(orient="records")
    
    num_rows = len(df)
    num_cols = len(df.columns)
    
    missing_values = int(df.isna().sum().sum())
    duplicate_count = int(df.duplicated().sum())
    
    numeric_cols = []
    categorical_cols = []
    date_cols = []
    boolean_cols = []
    
    columns_out = []
    
    for col in df.columns:
        col_series = df[col]
        missing = int(col_series.isna().sum())
        unique_vals = int(col_series.nunique())
        
        # Determine column type
        is_numeric = pd.api.types.is_numeric_dtype(col_series)
        is_datetime = pd.api.types.is_datetime64_any_dtype(col_series)
        is_bool = pd.api.types.is_bool_dtype(col_series)
        
        # Heuristics for type inference if object
        if not is_numeric and not is_datetime and not is_bool:
            # Try to convert to numeric
            try:
                pd.to_numeric(col_series.dropna())
                is_numeric = True
            except ValueError:
                # Try datetime
                try:
                    pd.to_datetime(col_series.dropna())
                    is_datetime = True
                except (ValueError, TypeError):
                    pass
        
        col_type = "string"
        out_stats = {}
        
        if is_bool:
            col_type = "boolean"
            boolean_cols.append(col)
        elif is_datetime:
            col_type = "date"
            date_cols.append(col)
        elif is_numeric:
            col_type = "numeric"
            numeric_cols.append(col)
            # Compute stats on valid numbers only
            valid_nums = pd.to_numeric(col_series, errors='coerce').dropna()
            if not valid_nums.empty:
                out_stats["mean"] = round(float(valid_nums.mean()), 2)
                out_stats["median"] = round(float(valid_nums.median()), 2)
        else:
            if unique_vals <= 20 and len(df) > 0:
                col_type = "categorical"
                categorical_cols.append(col)
            else:
                col_type = "string"
                
        # Top values
        val_counts = col_series.value_counts(dropna=True).head(5)
        top_values = [{"value": str(k), "count": int(v)} for k, v in val_counts.items()]
        
        columns_out.append({
            "name": str(col),
            "type": col_type,
            "missing": missing,
            "unique": unique_vals,
            "stats": out_stats,
            "top_values": top_values
        })
        
    # Helper to find a specific column concept by naming heuristic
    def find_col(names):
        for col in df.columns:
            if any(name in str(col).lower() for name in names):
                return col
        return None
        
    date_col = find_col(["date", "time", "day"])
    channel_col = find_col(["channel", "source", "category", "segment", "type"])
    region_col = find_col(["region", "country", "market", "area", "location", "territory"])
    orders_col = find_col(["order", "count", "volume", "quantity"])
    aov_col = find_col(["aov", "value", "revenue", "sales", "price", "amount"])
    returns_col = find_col(["return", "refund", "churn", "cancel"])
    
    normalized_rows = []
    
    # Precompute valid numeric series for fast iteration
    if orders_col:
        s_orders = pd.to_numeric(df[orders_col], errors='coerce').fillna(0)
    else:
        s_orders = pd.Series([0] * num_rows)
        
    if aov_col:
        s_aov = pd.to_numeric(df[aov_col], errors='coerce').fillna(0)
    else:
        s_aov = pd.Series([0] * num_rows)
        
    if returns_col:
        s_returns = pd.to_numeric(df[returns_col], errors='coerce').fillna(0)
    else:
        s_returns = pd.Series([0] * num_rows)
        
    for i in range(num_rows):
        normalized_rows.append({
            "date": str(df[date_col].iloc[i]) if date_col and pd.notna(df[date_col].iloc[i]) else f"Row {i+1}",
            "channel": str(df[channel_col].iloc[i]) if channel_col and pd.notna(df[channel_col].iloc[i]) else "Unassigned",
            "region": str(df[region_col].iloc[i]) if region_col and pd.notna(df[region_col].iloc[i]) else "Unknown",
            "orders": float(s_orders.iloc[i]),
            "aov": float(s_aov.iloc[i]),
            "returns": float(s_returns.iloc[i])
        })
        
    insights = []
    if missing_values > 0:
        pct = round((missing_values / (num_rows * num_cols)) * 100, 1)
        insights.append(f"Found {missing_values} missing values ({pct}% of data).")
    if duplicate_count > 0:
        insights.append(f"Detected {duplicate_count} duplicate rows.")
    if numeric_cols:
        insights.append(f"Identified {len(numeric_cols)} numeric columns suitable for charting.")
    
    if not insights:
        insights.append("Data looks clean and well-structured.")

    result = {
        "profile": {
            "rows": num_rows,
            "columns": num_cols,
            "missing_values": missing_values,
            "duplicate_rows": duplicate_count,
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "date_columns": date_cols,
            "boolean_columns": boolean_cols
        },
        "columns": columns_out,
        "raw_rows": raw_rows,
        "normalized_rows": normalized_rows,
        "insights": insights,
        "python_engine": True,
        "filename": args.filename
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    analyze()
