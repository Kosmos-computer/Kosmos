FROM prefecthq/prefect:latest-python3.7

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get -y update
RUN apt-get -y install git libpq-dev awscli ncat libmagickwand-dev libmariadb-dev libmariadb-dev-compat postgresql-client

# Install Python dependencies
RUN python -m pip install --upgrade pip
COPY requirements.txt .
RUN python -m pip uninstall -y enum34
RUN python -m pip install -r requirements.txt
RUN python -m pip install -U dask distributed
RUN python -m spacy download en_core_web_sm

# Copy over app code
COPY . .
