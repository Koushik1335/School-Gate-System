from flask import Flask, render_template

server = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

@server.route('/')
def index():
    return render_template('GateSystem.html')

if __name__ == "__main__":
    server.run(debug=True)
