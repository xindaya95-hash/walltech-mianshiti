"""
简单的静态文件服务器，用于预览HTML页面
"""
import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"📁 静态文件服务器启动: http://localhost:{PORT}")
        print(f"📂 服务目录: {DIRECTORY}")
        print(f"\n提示: 这只是静态HTML预览，完整功能需要启动React开发服务器")
        httpd.serve_forever()
