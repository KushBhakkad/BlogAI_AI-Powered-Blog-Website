import csv

# Define the CSV file path and table name
csv_file_path = "./blog.csv"
table_name = 'blog'

# Function to escape single quotes in string values
def escape_quotes(value):
    return value.replace("'", "''")

# Function to format values correctly
def format_value(value):
    if value.upper() == 'NULL' or value == '':
        return 'NULL'  # Handle NULL values and empty strings
    try:
        float_value = float(value)
        if float_value.is_integer():
            return str(int(float_value))  # Handle integers
        return str(float_value)  # Handle floats
    except ValueError:
        escaped_value = escape_quotes(value)
        return f"'{escaped_value}'"  # Add string values with quotes

# Read the CSV file and generate INSERT statements
insert_statements = []
with open(csv_file_path, mode='r', newline='', encoding='utf-8') as file:
    reader = csv.reader(file)
    headers = next(reader)  # Read the header row
    for row in reader:
        if len(row) == 0:
            continue  # Skip empty rows
        formatted_values = [format_value(value) for value in row]
        values = ', '.join(formatted_values)
        insert_statement = f"INSERT INTO {table_name} ({', '.join(headers)}) VALUES ({values});"
        insert_statements.append(insert_statement)

# Write the INSERT statements to a SQL file
with open('blog.sql', mode='w', newline='', encoding='utf-8') as file:
    for statement in insert_statements:
        file.write(statement + '\n')

print('SQL script generated successfully.')
