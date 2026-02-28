"""Real-time monitoring system."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4


@dataclass
class Metric:
    name: str
    value: float
    unit: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class MonitoringMetrics:
    behavior_metrics: list[Metric] = field(default_factory=list)
    security_metrics: list[Metric] = field(default_factory=list)
    custom_metrics: list[Metric] = field(default_factory=list)


@dataclass
class BehaviorEvent:
    id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = ""
    description: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    severity: str = "info"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class MonitoringReport:
    execution_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    events: list[BehaviorEvent] = field(default_factory=list)
    metrics: MonitoringMetrics = field(default_factory=MonitoringMetrics)
    anomalies: list[str] = field(default_factory=list)
    status: str = "completed"


class RealtimeMonitor:
    def __init__(self):
        self._active_monitors: dict[str, MonitoringReport] = {}
        self._event_handlers: list[callable] = []
        self._anomaly_thresholds: dict[str, float] = {
            "action_frequency": 100.0,
            "error_rate": 0.1,
            "resource_usage": 0.8,
        }
    
    def start_monitoring(self, execution_id: str) -> str:
        report = MonitoringReport(
            execution_id=execution_id,
            start_time=datetime.now(),
        )
        self._active_monitors[execution_id] = report
        return execution_id
    
    def stop_monitoring(self, execution_id: str) -> Optional[MonitoringReport]:
        report = self._active_monitors.get(execution_id)
        if not report:
            return None
        
        report.end_time = datetime.now()
        report.status = "completed"
        
        del self._active_monitors[execution_id]
        
        return report
    
    def record_event(
        self,
        execution_id: str,
        event_type: str,
        description: str,
        severity: str = "info",
        metadata: Optional[dict[str, Any]] = None,
    ) -> Optional[BehaviorEvent]:
        report = self._active_monitors.get(execution_id)
        if not report:
            return None
        
        event = BehaviorEvent(
            event_type=event_type,
            description=description,
            severity=severity,
            metadata=metadata or {},
        )
        
        report.events.append(event)
        
        self._notify_handlers(event)
        
        return event
    
    def record_metric(
        self,
        execution_id: str,
        name: str,
        value: float,
        unit: str = "",
        category: str = "behavior",
    ) -> Optional[Metric]:
        report = self._active_monitors.get(execution_id)
        if not report:
            return None
        
        metric = Metric(name=name, value=value, unit=unit)
        
        if category == "behavior":
            report.metrics.behavior_metrics.append(metric)
        elif category == "security":
            report.metrics.security_metrics.append(metric)
        else:
            report.metrics.custom_metrics.append(metric)
        
        self._check_anomaly(execution_id, name, value)
        
        return metric
    
    def get_current_metrics(self, execution_id: str) -> Optional[MonitoringMetrics]:
        report = self._active_monitors.get(execution_id)
        if not report:
            return None
        return report.metrics
    
    def detect_anomaly(self, execution_id: str) -> list[str]:
        report = self._active_monitors.get(execution_id)
        if not report:
            return []
        
        return report.anomalies
    
    def register_event_handler(self, handler: callable) -> None:
        self._event_handlers.append(handler)
    
    def set_anomaly_threshold(self, metric_name: str, threshold: float) -> None:
        self._anomaly_thresholds[metric_name] = threshold
    
    def _notify_handlers(self, event: BehaviorEvent) -> None:
        for handler in self._event_handlers:
            try:
                handler(event)
            except Exception:
                pass
    
    def _check_anomaly(self, execution_id: str, metric_name: str, value: float) -> None:
        report = self._active_monitors.get(execution_id)
        if not report:
            return
        
        threshold = self._anomaly_thresholds.get(metric_name)
        if threshold and value > threshold:
            anomaly = f"异常检测: {metric_name} = {value} (阈值: {threshold})"
            report.anomalies.append(anomaly)
            
            self.record_event(
                execution_id,
                event_type="anomaly_detected",
                description=anomaly,
                severity="warning",
                metadata={"metric": metric_name, "value": value, "threshold": threshold},
            )
