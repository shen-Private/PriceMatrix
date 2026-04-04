# PriceMatrix 学习日志 #002 - 环境安装与 Spring Boot 初体验

**日期:** 2026-02-01  
**阶段:** 环境准备阶段  
**状态:** ✅ 完成  

---

## 📋 今日目标

1. 安装 JDK 17
2. 安装 IntelliJ IDEA Community
3. 建立第一个 Spring Boot 项目
4. 成功启动 Spring Boot 应用

---

## ✅ 完成项目

### 1. JDK 17 安装

**选择:** Eclipse Temurin JDK 17.0.17 (LTS)

**安装步骤:**
- 从 Adoptium 官网下载 .msi 安装包
- 选择 "Install for all users"
- **重要:** 勾选 "Set JAVA_HOME variable"
- **重要:** 勾选 "Add to PATH"

**验证:**
```bash
C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot
```

**为什么选 JDK 17 而不是 JDK 25?**
- JDK 17 = LTS (长期支持版，支持到 2029)
- Spring Boot 3.x 官方推荐
- 学习资源丰富
- JDK 25 = 非 LTS，半年后就过时

---

### 2. IntelliJ IDEA Community 安装

**版本:** 2025.3.2

**安装选项:**
- ✓ 创建桌面快捷方式
- ✓ Add "Open Folder as Project"
- ✓ 关联 .java 文件

**插件安装:**
- ✓ Spring (核心插件)
- ✓ Spring Boot
- ✓ Spring Initializr

---

### 3. 第一个 Java 程序 (hello-spring)

**项目类型:** 纯 Java 项目

**程序内容:**
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello and welcome!");
        
        for (int i = 1; i <= 5; i++) {
            System.out.println("i = " + i);
        }
    }
}
```

**执行结果:**
```
Hello and welcome!
i = 1
i = 2
i = 3
i = 4
i = 5

Process finished with exit code 0
```

**学到的概念:**
- `public class` = Java 的基本单位
- `main` 方法 = 程序入口点 (类似 WordPress 的 index.php)
- `System.out.println()` = 输出到控制台 (类似 PHP 的 `echo`)
- 编译型语言需要先编译再执行

---

### 4. Spring Boot 项目创建 (pricematrix-demo)

**项目配置:**
```
Name: pricematrix-demo
Group: com.pricematrix
Artifact: pricematrix-demo
Type: Maven
Java: 17
Packaging: Jar
Spring Boot: 4.0.2
```

**选择的依赖:**
- ✓ Spring Boot DevTools (开发工具，支持热重载)
- ✓ Spring Web (网页框架)
- ✓ Spring Data JPA (数据库操作)
- ✓ MySQL Driver (MySQL 驱动)
- ✓ H2 Database (内嵌测试数据库) ← 后来手动添加

**项目结构:**
```
pricematrix-demo/
├── .idea/                    # IntelliJ 配置
├── .mvn/                     # Maven wrapper
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com.pricematrix.pricematrixdemo/
│   │   │       └── PricematrixDemoApplication.java  # 主程序
│   │   └── resources/
│   │       ├── static/       # 静态资源
│   │       ├── templates/    # 模板文件
│   │       └── application.properties  # 配置文件
│   └── test/                 # 测试代码
├── target/                   # 编译输出
├── .gitignore
├── HELP.md
├── mvnw, mvnw.cmd           # Maven wrapper 脚本
└── pom.xml                  # Maven 配置文件 (依赖管理)
```

---

### 5. 遇到的第一个错误 (正常的学习过程)

**错误讯息:**
```
APPLICATION FAILED TO START

Failed to configure a DataSource: 'url' attribute is not specified
```

**原因:**
- 我们选择了 MySQL Driver 和 Spring Data JPA
- Spring Boot 启动时想连接数据库
- 但我们还没告诉它数据库在哪里

**解决方案:**
在 `pom.xml` 添加 H2 内嵌数据库：
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

**为什么用 H2?**
- 内嵌数据库，不需要额外安装
- 适合开发和测试
- 之后再切换到真正的 MySQL

---

### 6. Spring Boot 成功启动！

**启动讯息 (关键部分):**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/

 :: Spring Boot ::                (v4.0.2)

HikariPool-1 - Start completed.
Tomcat started on port 8080 (http)
Started PricematrixDemoApplication in 2.247 seconds
```

**解读:**
- ✅ H2 数据库连接成功 (HikariPool)
- ✅ Tomcat 网页服务器启动在 8080 端口
- ✅ 总共只花了 2.2 秒启动 (电竞笔电威力!)

**验证:**
打开浏览器访问 `http://localhost:8080`  
看到 "Whitelabel Error Page" = 正常！(因为还没写任何 API)

---

## 💡 深入理解的概念

### 1. Java 语言 vs JDK

**Java 语言:**
- 只是一种「程式语言规范」
- 定义了语法规则
- 就像「中文」是一种语言

**JDK (Java Development Kit):**
- 是「实作 Java 语言的完整工具箱」
- 包含编译器 (javac)、执行器 (java)、标准库等
- 就像「字典 + 文法书 + 作文范本 + 印刷机」

**WordPress 类比:**
```
PHP 语言        →  Java 语言
PHP 安装包      →  JDK
WordPress       →  Spring Boot
PHPStorm        →  IntelliJ IDEA
```

---

### 2. 编译型 vs 解释型语言

**解释型语言 (边读边执行):**
- HTML/CSS/JS、PHP、Python
- 优点: 改了马上看结果
- 缺点: 执行较慢

**编译型语言 (先翻译再执行):**
- Java、C/C++
- 优点: 执行超快
- 缺点: 改了要重新编译

**WordPress 开发 vs Java 开发:**
```
PHP:
改 code → 存档 → F5 → 马上看结果 ✓

Java (传统):
改 code → 编译 → 重启 → 等 30 秒 → 看结果 ✗

Java + Hot Reload:
改 code → 存档 → 自动热替换 → 5 秒看结果 ✓
```

---

### 3. JIT Compiler 预热机制

**什么是 JIT?**
JIT = Just-In-Time Compiler (即时编译器)

**运作流程:**

**阶段 1: 程式刚启动**
```
你的 Java code (.class 档案)
    ↓
JVM 用「解释模式」执行 ← 比较慢
    ↓
同时「监控」哪些 code 最常执行
```

**阶段 2: 发现热点**
```
JVM 发现:
「这个函数被呼叫 1000 次了!」
「这个迴圈跑超多次!」
```

**阶段 3: 即时编译**
```
JIT Compiler 启动:
├─ 把「热点 code」重新编译
├─ 编译成「超级优化的机器码」
├─ 存到「记忆体的 Code Cache」
└─ 之后执行时直接用优化版本
```

**结果:**
```
第 1 次请求: 500ms ← 慢
第 10 次请求: 300ms ← 变快了
第 100 次请求: 100ms ← 更快了!
```

**记忆体配置:**
```
JVM 记忆体分区:
├─ Heap (你的程式资料)
├─ Stack (函数呼叫)
├─ Code Cache (JIT 优化 code) ← 约 240MB
└─ Metaspace (类别资讯)
```

**厨师比喻:**
```
第 1-100 次做红烧肉:
└─ 每次都看食谱 (慢)

第 100 次后:
└─ 厨师「背起来」了!
   └─ 不用看食谱,直接做 (快)
   └─ 但「背起来的食谱」占用「脑容量」
```

---

## 🛠️ 使用的工具

### Maven (依赖管理工具)

**pom.xml 档案的作用:**
- 定义项目的基本资讯 (名称、版本、打包方式)
- 管理依赖 (需要哪些函式库)
- 配置编译和打包流程

**类比:**
- 就像 WordPress 的 `composer.json`
- 或 Node.js 的 `package.json`

**实际操作:**
1. 在 pom.xml 添加依赖
2. IntelliJ 右上角出现 "m" 图标
3. 点击重新加载
4. Maven 自动下载依赖到本地

**依赖存放位置:**
```
C:\Users\vcd52\.m2\repository\
```

---

### Spring Boot DevTools (开发者工具)

**功能:**
- 热重载 (Hot Reload): 改 code 不用重启
- 自动重启 (比完全重启快很多)
- LiveReload: 前端页面自动刷新

**什么时候会用到?**
- 开发阶段超实用!
- 改一行 code → 自动重新编译 → 继续测试
- 不用像传统方式每次都重启程序

---

## 📊 今日统计

**安装软件:**
- JDK 17: ~180MB
- IntelliJ IDEA: ~800MB
- Maven 依赖: ~150MB (自动下载)

**项目数量:** 2
- hello-spring (纯 Java 测试项目)
- pricematrix-demo (Spring Boot 项目)

**总耗时:** 约 90 分钟
- JDK 安装: 10 分钟
- IntelliJ 安装: 10 分钟
- 第一个 Java 程序: 10 分钟
- Spring Boot 项目: 40 分钟
- 概念讨论与学习: 20 分钟

**代码行数:** ~100 行 (包含配置档)

---

## 🎯 学习成果

### 技术能力提升

**已掌握:**
- ✅ Java 开发环境搭建
- ✅ IntelliJ IDEA 基本操作
- ✅ Maven 依赖管理基础
- ✅ Spring Boot 项目创建
- ✅ 基本的错误排查能力

**理解的概念:**
- ✅ JDK vs Java 语言的差异
- ✅ 编译型 vs 解释型语言
- ✅ JIT 编译器的优化机制
- ✅ Spring Boot 的启动流程
- ✅ 内嵌数据库的作用

---

## 🚀 下次目标

### 主线任务: 建立第一个 REST API

**目标:**
创建一个简单的 API，返回 "Hello PriceMatrix!"

**预期学习内容:**
1. Controller 的概念与使用
2. @RestController 注解
3. @GetMapping 路由设定
4. 测试 API (使用浏览器或 Postman)

**预计时长:** 30-45 分钟

---

## 💭 今日反思

### 顺利的部分
- 电竞笔电 32GB RAM 跑起来超顺
- 英文界面虽然一开始有点担心，但其实不难
- 遇到错误时能快速找到解决方案
- 概念理解得很透彻 (问了很多好问题!)

### 学到的经验
- 装软件要注意 "Set JAVA_HOME" 这种关键选项
- Maven 添加依赖后要记得 "Reload"
- Spring Boot 的错误讯息其实很清楚
- 内嵌数据库 (H2) 对开发阶段很有帮助

### 有趣的发现
- JIT 预热机制跟厨师练习的比喻超贴切
- IntelliJ 的界面设计确实影响了 VSCode
- Spring Boot 的 Logo 很可爱 😄

---

## 📚 相关资源

### 官方文档
- [Spring Boot 官网](https://spring.io/projects/spring-boot)
- [Spring Initializr](https://start.spring.io/)
- [Eclipse Temurin](https://adoptium.net/)

### 下次可能用到的资源
- Spring Boot REST API 教学
- Spring Data JPA 基础
- MySQL 安装与设定

---

## 🎓 金句记录

> "Java 语言 = 建筑设计图，JDK = 施工队 + 工具"

> "寧可慢 10 毫秒去確認真相，也不要快 1 秒鐘去存錯誤的資料。"

> "慢慢来，比较快。理解了，才算学会。"

---

**学习状态:** 🟢 进展顺利  
**信心指数:** ⭐⭐⭐⭐⭐ (5/5)  
**期待下次:** 💪💪💪

---

**文件版本:** v1.0  
**最后更新:** 2026-02-01