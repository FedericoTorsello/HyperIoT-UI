import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

import { Subscription } from 'rxjs';

import { FormBuilder } from '@angular/forms';

import { HPacket, HpacketsService } from '@hyperiot/core';
import { Option } from '@hyperiot/components';

import { ProjectDetailEntity, LoadingStatusEnum } from '../project-detail-entity';

@Component({
  selector: 'hyt-packet-data',
  templateUrl: './packet-data.component.html',
  styleUrls: ['./packet-data.component.scss']
})
export class PacketDataComponent extends ProjectDetailEntity implements OnDestroy {
  packetId: number;
  packet: HPacket = {} as HPacket;
  deviceName: '---';

  typeOptions: Option[] = Object.keys(HPacket.TypeEnum)
    .map((k) => { return {label: k, value: k} });

  serializationOptions: Option[] = Object.keys(HPacket.SerializationEnum)
    .map((k) => { return {label: k, value: k} });

  formatOptions: Option[] = Object.keys(HPacket.FormatEnum)
    .map((k) => { return {label: k, value: k} });

  trafficPlanOptions: Option[] = Object.keys(HPacket.TrafficPlanEnum)
    .map((k) => { return {label: k, value: k} });

  private routerSubscription: Subscription;

  constructor(
    formBuilder: FormBuilder,
    private hPacketService: HpacketsService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    super(formBuilder);
    this.routerSubscription = this.router.events.subscribe((rl) => {
      if (rl instanceof NavigationEnd) {
        this.packetId = this.activatedRoute.snapshot.params.packetId;
        this.loadPacket();
      }
    });
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
  }

  // ProjectDetailEntity interface
  save(successCallback, errorCallback) {
    this.savePacket(successCallback, errorCallback);
  }
  delete(successCallback, errorCallback) {
    this.deletePacket(successCallback, errorCallback);
  }

  private loadPacket() {
    this.loadingStatus = LoadingStatusEnum.Loading;
    this.hPacketService.findHPacket(this.packetId).subscribe((p: HPacket) => {
      this.packet = p;
      // update form data
      this.form.get('hpacket-name')
        .setValue(p.name);
      this.form.get('hpacket-type')
        .setValue(p.type);
      this.form.get('hpacket-serialization')
        .setValue(p.serialization);
      this.form.get('hpacket-format')
        .setValue(p.format);
      this.form.get('hpacket-timestampfield')
        .setValue(p.timestampField);
      this.form.get('hpacket-timestampformat')
        .setValue(p.timestampFormat);
      this.form.get('hpacket-trafficplan')
        .setValue(p.trafficPlan);
      this.resetForm();
      this.treeHost && this.treeHost.focus({id: p.id, type: 'packet'});
      this.loadingStatus = LoadingStatusEnum.Ready;
    }, (err) => {
      this.loadingStatus = LoadingStatusEnum.Error;
    });
  }
  private savePacket(successCallback?, errorCallback?) {
    this.loadingStatus = LoadingStatusEnum.Saving;
    this.validationError = [];
    let p = this.packet;
    p.name = this.form.get('hpacket-name').value;
    p.type = this.form.get('hpacket-type').value;
    p.type = p.type['value'] || p.type; // TODO: <-- this is a fix for 'hyt-radio-button' bug
    p.serialization = this.form.get('hpacket-serialization').value;
    p.serialization = p.serialization['value'] || p.serialization; // TODO: <-- this is a fix for 'hyt-radio-button' bug
    p.format = this.form.get('hpacket-format').value;
    p.format = p.format['value'] || p.format; // TODO: <-- this is a fix for 'hyt-radio-button' bug
    p.timestampField = this.form.get('hpacket-timestampfield').value;
    p.timestampFormat = this.form.get('hpacket-timestampformat').value;
    p.trafficPlan = this.form.get('hpacket-trafficplan').value;
    this.hPacketService.updateHPacket(p).subscribe((res) => {
      this.packet = p = res;
      this.resetForm();
      this.treeHost && this.treeHost.updateNode({id: p.id, type: 'packet', name: p.name});
      this.loadingStatus = LoadingStatusEnum.Ready;
      successCallback && successCallback(res);
    }, (err) => {
      if (err.error && err.error.validationErrors) {
        this.setError(err);
        this.loadingStatus = LoadingStatusEnum.Ready;
      } else {
        this.loadingStatus = LoadingStatusEnum.Error;
      }
      errorCallback && errorCallback(err);
    });
  }
  private deletePacket(successCallback?, errorCallback?) {
    this.loadingStatus = LoadingStatusEnum.Saving;
    this.hPacketService.deleteHPacket(this.packet.id).subscribe((res) => {
      successCallback && successCallback(res);
      this.loadingStatus = LoadingStatusEnum.Ready;
      // Navigate to parent node (device page)
      this.router.navigate([
        '/projects', this.packet.device.project.id,
        {outlets: { projectDetails: ['device', this.packet.device.id] }}
      ]);
      this.treeHost.refresh();
    }, (err) => {
      errorCallback && errorCallback(err);
      this.loadingStatus = LoadingStatusEnum.Error;
    });
  }

}
