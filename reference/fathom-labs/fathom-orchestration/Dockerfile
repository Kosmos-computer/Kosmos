FROM prefecthq/prefect:latest-python3.8

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get -y update
RUN apt-get -y install curl git libpq-dev awscli ncat libmagickwand-dev libmariadb-dev libmariadb-dev-compat postgresql-client sqlite3 libsqlite3-dev

# Install Python dependencies
RUN python -m pip install --upgrade pip
COPY requirements.txt .
RUN python -m pip uninstall -y enum34
RUN python -m pip install -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Copy over app code
COPY . .
