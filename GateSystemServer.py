
from flask import Flask, render_template
from datetime import datetime

server = Flask(__name__, template_folder='.', static_folder='static')

DATABASE = {
    "44644168": {"name": "Priya Nair", "role": "Seniors"},
    "44644260": {"name": "Ben Carter", "role": "Seniors"},
    "44644522": {"name": "Maya Chen", "role": "Juniors"},
    "44644681": {"name": "Daniel Ho", "role": "Staff"},
}

ATTENDANCE_CUTOFF = "08:45"


def get_open_windows(day):
    windows = [("07:00", "08:45", None)]

    if day == "Tuesday":
        windows.append(("13:30", "13:50", {"Seniors"}))
        windows.append(("15:05", "15:45", None))
    elif day == "Wednesday":
        windows.append(("13:30", "13:50", None))
    else:
        windows.append(("15:05", "15:45", None))

    return windows


def is_open(day, time_str, role):
    if time_str >= "16:00":
        return True

    for opentime, closetime, allowed_roles in get_open_windows(day):
        if opentime <= time_str <= closetime:
            if allowed_roles is None or role in allowed_roles:
                return True

    return False


def get_relevant_window(day, time_str):
    windows = get_open_windows(day)
    for opentime, closetime, _ in windows:
        if time_str <= closetime:
            return opentime, closetime
    return windows[-1][0], windows[-1][1]


def to_display_time(time_str):
    return datetime.strptime(time_str, "%H:%M").strftime("%I:%M%p").lstrip("0")


@server.route('/')
def simulation():
    return render_template('GateSimulation.html')


if __name__ == "__main__":
    server.run(debug=True)
