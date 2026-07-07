FROM python:3.8

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get -y update
RUN apt-get -y install git libpq-dev python3-uvloop postgresql-client sqlite3 libsqlite3-dev

# Install Python dependencies
RUN python -m pip install --upgrade pip
RUN python -m pip uninstall -y enum34
RUN python -m pip install -U dask distributed 
RUN python -m pip install -U spacy==2.3.1
RUN python -m spacy download en_core_web_sm
RUN python -m pip install striprtf

# Copy over app code
COPY . .

# Install Python dependencies
RUN python -m pip install .