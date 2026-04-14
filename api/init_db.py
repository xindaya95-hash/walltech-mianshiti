import sqlite3
import hashlib
import os

def init_db():
    conn = sqlite3.connect("crm.db")
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        company TEXT,
        status TEXT DEFAULT '潜在客户',
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    try:
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            (1, 'admin', hashlib.md5('admin123'.encode()).hexdigest(), '管理员', '管理员'))
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            (2, 'zhangsan', hashlib.md5('123456'.encode()).hexdigest(), '销售', '张三'))
    except: pass
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
