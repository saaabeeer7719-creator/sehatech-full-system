import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# تفعيل CORS للسماح بالطلبات من الواجهة الأمامية
CORS(app, origins=["*"])

# تسجيل البلوبرينتس
app.register_blueprint(user_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "SehaTech Simple Backend API is running! 🚀", 200

# إضافة route للتحقق من صحة API
@app.route('/api/health')
def health_check():
    return {
        'status': 'healthy',
        'message': 'SehaTech Simple Backend API is running',
        'version': '1.0.0'
    }

# APIs مبسطة للمواعيد
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    # بيانات تجريبية
    appointments = [
        {
            'id': '1',
            'patientName': 'أحمد محمد',
            'doctorName': 'د. سارة أحمد',
            'dateTime': '2024-01-15T10:00:00Z',
            'status': 'Scheduled'
        },
        {
            'id': '2',
            'patientName': 'فاطمة علي',
            'doctorName': 'د. محمد حسن',
            'dateTime': '2024-01-15T14:00:00Z',
            'status': 'Completed'
        }
    ]
    return jsonify({'appointments': appointments})

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    # بيانات تجريبية
    notifications = [
        {
            'id': '1',
            'title': 'موعد جديد',
            'message': 'لديك موعد جديد غداً في الساعة 10:00 صباحاً',
            'type': 'appointment',
            'read': False,
            'timestamp': '2024-01-14T15:30:00Z'
        }
    ]
    return jsonify({'notifications': notifications})

@app.route('/api/realtime/status', methods=['GET'])
def get_realtime_status():
    return jsonify({
        'status': 'connected',
        'last_sync': '2024-01-14T15:30:00Z',
        'active_users': 5,
        'pending_updates': 0
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

