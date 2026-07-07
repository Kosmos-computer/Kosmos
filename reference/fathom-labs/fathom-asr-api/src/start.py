import app

web = app.web
if __name__ == '__main__':
    web.run(
        host='0.0.0.0', 
        port=app.env['port'], 
        debug=(app.env['debug'] == 'True'),
        auto_reload=(app.env['auto_reload'] == 'True')
    )
