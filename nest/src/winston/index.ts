import { WinstonModule, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file'; // 引入按天滚动切分插件
import { join } from 'path';
const winstonLogger = {
  logger: WinstonModule.createLogger({
    transports: [
      // 控制台打印
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          // nestLike 来自 nest-winston 的 utilities，不是 winston.format
          nestWinstonUtilities.format.nestLike('JKVideo', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),

      //   全自动“按天滚动”把【常规运行日志】写入 logs/app-yyyy-mm-dd.log

      new winston.transports.DailyRotateFile({
        dirname: join(process.cwd(), 'logs'), // 日志文件夹路径
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true, // 自动把历史旧日志压缩成 .gz 格式，极大地节省服务器硬盘
        maxSize: '20m', // 单个文件超过 20MB 自动切分（如 app-xxx.1.log）
        maxFiles: '14d', // 硬盘里最多只保留最近 14 天的日志，过期的全自动销毁
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(), // 生产环境落盘用纯 JSON 格式，未来极方便对接外部搜集系统
        ),
      }),
      //   精准捕捉【致命崩溃日志】，单独拧出来存进单独的 errors-yyyy-mm-dd.log
      // 精准捕捉致命崩溃日志，单独存进 errors-yyyy-mm-dd.log
      new winston.transports.DailyRotateFile({
        dirname: join(process.cwd(), 'logs'),
        filename: 'errors-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error', // 🚨 关键过滤器：普通的 log / warn 直接无视，只抓 error 级别
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d', // 错误日志多留存一会儿，保留 30 天便于秋后算账
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  }),
};
export { winstonLogger };
