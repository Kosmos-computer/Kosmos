# fathom-tasks
A collection of Fathom Prefect tasks

## Requirements:
- Python >3.6 <3.9
- config.ini file

```
# enum34 causes problems when installing Prefect requirements - not an issue on all systems
pip uninstall -y enum34
pip3 install -r requirements.txt
python3 flows/user/update_user_taste.py
```

## Docker
For details on the Docker implementation, see [DOCKER.md](DOCKER.md)

## Registering Flows
- To add flows to the registration process, add them to [flows/__main__.py](flows/__main__.py).
- To register flows in Prod, run `./prod-console.sh python -m flows register` 
- To register flows in Dev, run `./dev-console.sh python -m flows register`