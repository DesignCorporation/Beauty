/**
 * Эмиттеры событий для WebSocket
 * Используются для отправки real-time уведомлений через Socket.IO
 */

import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

/**
 * Установить глобальный экземпляр Socket.IO
 */
export function setSocketIOInstance(io: SocketIOServer): void {
  ioInstance = io;
  console.log('[Emitters] Socket.IO instance registered');
}

/**
 * Получить текущий экземпляр Socket.IO
 */
export function getSocketIOInstance(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Эмитировать событие создания записи
 */
export function emitAppointmentCreated(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  tenantId: string;
  startAt: string;
  endAt: string;
  service: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit appointmentCreated');
    return;
  }

  const salonRoom = `salon:${data.tenantId}`;
  const clientRoom = `user:${data.clientId}`;

  const eventPayload = {
    type: 'appointment_created',
    appointmentId: data.appointmentId,
    clientName: data.clientName,
    staffName: data.staffName,
    service: data.service,
    startAt: data.startAt,
    endAt: data.endAt,
    timestamp: new Date().toISOString()
  };

  // Отправить в комнату салона (для админов и мастеров)
  io.to(salonRoom).emit('notification:new', {
    ...eventPayload,
    title: `Новая запись: ${data.clientName}`,
    message: `${data.service} с ${data.staffName}`,
    target: 'staff'
  });

  // Отправить клиенту
  io.to(clientRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Ваша запись подтверждена',
    message: `${data.service} на ${data.startAt}`,
    target: 'client'
  });

  console.log(`[Emitters] 📬 appointmentCreated event emitted`);
  console.log(`   - Salon room: ${salonRoom}`);
  console.log(`   - Client room: ${clientRoom}`);
  console.log(`   - Appointment: ${data.appointmentId}`);
}

/**
 * Эмитировать событие завершения платежа
 */
export function emitPaymentCompleted(data: {
  paymentId: string;
  amount: number;
  currency: string;
  appointmentId?: string;
  tenantId: string;
  clientId?: string;
  clientName: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit paymentCompleted');
    return;
  }

  const salonRoom = `salon:${data.tenantId}`;
  const clientRoom = data.clientId ? `user:${data.clientId}` : null;

  const eventPayload = {
    type: 'payment_completed',
    paymentId: data.paymentId,
    appointmentId: data.appointmentId,
    amount: data.amount,
    currency: data.currency,
    clientName: data.clientName,
    timestamp: new Date().toISOString()
  };

  // Отправить в комнату салона (для админов)
  io.to(salonRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Платёж получен',
    message: `${data.amount} ${data.currency} от ${data.clientName}`,
    target: 'admin'
  });

  // Отправить клиенту (если известен)
  if (clientRoom) {
    io.to(clientRoom).emit('notification:new', {
      ...eventPayload,
      title: 'Платёж принят',
      message: `Сумма: ${data.amount} ${data.currency}`,
      target: 'client'
    });
  }

  console.log(`[Emitters] 💳 paymentCompleted event emitted`);
  console.log(`   - Salon room: ${salonRoom}`);
  if (clientRoom) {
    console.log(`   - Client room: ${clientRoom}`);
  }
  console.log(`   - Payment: ${data.paymentId}, Amount: ${data.amount} ${data.currency}`);
}

/**
 * Эмитировать событие ошибки платежа
 */
export function emitPaymentFailed(data: {
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  tenantId: string;
  clientName: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit paymentFailed');
    return;
  }

  const salonRoom = `salon:${data.tenantId}`;

  const eventPayload = {
    type: 'payment_failed',
    paymentId: data.paymentId,
    amount: data.amount,
    currency: data.currency,
    reason: data.reason,
    clientName: data.clientName,
    timestamp: new Date().toISOString()
  };

  io.to(salonRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Ошибка платежа',
    message: `${data.amount} ${data.currency}. Причина: ${data.reason}`,
    target: 'admin'
  });

  console.log(`[Emitters] ⚠️ paymentFailed event emitted`);
  console.log(`   - Salon room: ${salonRoom}`);
  console.log(`   - Payment: ${data.paymentId}`);
}

/**
 * Эмитировать напоминание о записи
 */
export function emitAppointmentReminder(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  staffName: string;
  service: string;
  startAt: string;
  hoursUntilAppointment: number;
  tenantId: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit appointmentReminder');
    return;
  }

  const clientRoom = `user:${data.clientId}`;

  const eventPayload = {
    type: 'appointment_reminder',
    appointmentId: data.appointmentId,
    clientName: data.clientName,
    staffName: data.staffName,
    service: data.service,
    startAt: data.startAt,
    hoursUntilAppointment: data.hoursUntilAppointment,
    timestamp: new Date().toISOString()
  };

  // Отправить клиенту напоминание
  io.to(clientRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Напоминание о записи',
    message: `${data.service} через ${data.hoursUntilAppointment} часов с ${data.staffName}`,
    priority: 'high',
    target: 'client'
  });

  console.log(`[Emitters] ⏰ appointmentReminder event emitted`);
  console.log(`   - Client room: ${clientRoom}`);
  console.log(`   - Appointment: ${data.appointmentId}`);
  console.log(`   - Hours until: ${data.hoursUntilAppointment}`);
}

/**
 * Эмитировать событие отмены записи
 */
export function emitAppointmentCancelled(data: {
  appointmentId: string;
  clientId: string;
  clientName: string;
  tenantId: string;
  reason?: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit appointmentCancelled');
    return;
  }

  const salonRoom = `salon:${data.tenantId}`;
  const clientRoom = `user:${data.clientId}`;

  const eventPayload = {
    type: 'appointment_cancelled',
    appointmentId: data.appointmentId,
    clientName: data.clientName,
    reason: data.reason,
    timestamp: new Date().toISOString()
  };

  io.to(salonRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Запись отменена',
    message: data.reason || 'Запись была отменена',
    target: 'staff'
  });

  io.to(clientRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Ваша запись отменена',
    message: data.reason || 'Запись была отменена по запросу салона',
    target: 'client'
  });

  console.log(`[Emitters] ❌ appointmentCancelled event emitted`);
  console.log(`   - Salon room: ${salonRoom}`);
  console.log(`   - Client room: ${clientRoom}`);
}

/**
 * Эмитировать событие возврата платежа
 */
export function emitRefundProcessed(data: {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  tenantId: string;
  clientName: string;
  reason?: string;
}): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit refundProcessed');
    return;
  }

  const salonRoom = `salon:${data.tenantId}`;

  const eventPayload = {
    type: 'payment_refunded',
    refundId: data.refundId,
    paymentId: data.paymentId,
    amount: data.amount,
    currency: data.currency,
    reason: data.reason,
    timestamp: new Date().toISOString()
  };

  io.to(salonRoom).emit('notification:new', {
    ...eventPayload,
    title: 'Возврат оформлен',
    message: `${data.amount} ${data.currency} возвращено. ${data.reason || ''}`.trim(),
    target: 'admin'
  });

  console.log(`[Emitters] 🔄 refundProcessed event emitted`);
  console.log(`   - Salon room: ${salonRoom}`);
  console.log(`   - Refund: ${data.refundId}, Payment: ${data.paymentId}`);
}

/**
 * Эмитировать общее уведомление в комнату
 * (для тестирования и отладки)
 */
export function emitToRoom(room: string, event: string, data: Record<string, unknown>): void {
  const io = getSocketIOInstance();

  if (!io) {
    console.warn('[Emitters] Socket.IO not initialized, cannot emit to room');
    return;
  }

  io.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });

  console.log(`[Emitters] 📢 Event '${event}' emitted to room: ${room}`);
}

/**
 * Получить количество подключенных клиентов в комнате
 */
export function getRoomClientCount(room: string): number {
  const io = getSocketIOInstance();

  if (!io) {
    return 0;
  }

  const roomClients = io.sockets.adapter.rooms.get(room);
  return roomClients ? roomClients.size : 0;
}

/**
 * Получить статистику Socket.IO
 */
export function getSocketIOStats() {
  const io = getSocketIOInstance();

  if (!io) {
    return {
      connected: false,
      clients: 0,
      rooms: 0
    };
  }

  return {
    connected: true,
    clients: io.sockets.sockets.size,
    rooms: io.sockets.adapter.rooms.size,
    namespaces: io._nsps.size
  };
}
