import { Component, OnInit } from '@angular/core';
import { HytModal, HytModalService } from '@hyperiot/components';
import { AreasService, HprojectsService, HdevicesService, AreaDevice, HDevice, Area } from '@hyperiot/core';

@Component({
  selector: 'hyt-area-device-select-dialog',
  templateUrl: './area-device-select-dialog.component.html',
  styleUrls: ['./area-device-select-dialog.component.scss']
})
export class AreaDeviceSelectDialogComponent extends HytModal implements OnInit {
  projectDevices: HDevice[];
  selectedDevice: HDevice;

   // @@I18N@@ (for all labels)
  deviceIconOptions = [
    { label: 'Motion Sensor', value: 'motion-sensor.png' },
    { label: 'Wind Sensor', value: 'wind-sensor.png' },
    { label: 'Body Scanner', value: 'body-scanner.png' },
    { label: 'Door Sensor', value: 'door-sensor.png' },
    { label: 'GPS Sensor', value: 'gps-sensor.png' },
    { label: 'Automated Light', value: 'light.png' },
    { label: 'Rain Sensor', value: 'rain-sensor.png' },
    { label: 'RFID Sensor', value: 'rfid.png' },
    { label: 'Thermometer', value: 'thermometer.png' }
  ];
  selectedDeviceIcon: string;

  constructor(
    hytModalService: HytModalService,
    private areaService: AreasService,
    private deviceService: HdevicesService
  ) {
    super(hytModalService);
  }

  ngOnInit() {
    this.deviceService.findAllHDeviceByProjectId(this.data.projectId).subscribe((projectDevices: HDevice[]) => {
      this.projectDevices = projectDevices;
      this.areaService.getAreaDeviceDeepListFromRoot(this.data.areaId).subscribe((assignedDevices) => {
        projectDevices.map(pd => {
          const ad = assignedDevices.filter((d: AreaDevice) => d.device.id === pd.id);
          if (ad.length > 0) {
            pd['added'] = true;
            this.areaService.findArea(ad[0].area.id)
              .subscribe((deviceArea: Area) => {
                pd['area'] = deviceArea.name;
              });
          }
        });
      });
    });
  }

  onAddButtonClick() {
    this.close({ device: this.selectedDevice, icon: this.selectedDeviceIcon });
  }
}
